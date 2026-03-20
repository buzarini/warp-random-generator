const fetch = require('node-fetch');
const nacl = require('tweetnacl');
const { Buffer } = require('buffer');
const dnsPacket = require('dns-packet');

// Генерация ключей WireGuard
function generateKeys() {
    const keyPair = nacl.box.keyPair();
    return {
        privKey: Buffer.from(keyPair.secretKey).toString('base64'),
        pubKey: Buffer.from(keyPair.publicKey).toString('base64')
    };
}

// Запросы к API Cloudflare
async function apiRequest(method, endpoint, body = null, token = null) {
    const headers = {
        'User-Agent': '',
        'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(`https://api.cloudflareclient.com/v0i1909051800/${endpoint}`, options);
    return response.json();
}

// Генерация случайного endpoint
function generateRandomEndpoint() {
    const prefixes = ["162.159.192.", "162.159.195.", "engage.cloudflareclient.com"];
    const ports = [500, 854, 859, 864, 878, 880, 890, 891, 894, 903, 908, 928, 934, 939, 942, 943, 945, 946, 955, 968, 987, 988, 1002, 1010, 1014, 1018, 1070, 1074, 1180, 1387, 1701, 1843, 2371, 2408, 2506, 3138, 3476, 3581, 3854, 4177, 4198, 4233, 4500, 5279, 5956, 7103, 7152, 7156, 7281, 7559, 8319, 8742, 8854, 8886];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const port = ports[Math.floor(Math.random() * ports.length)];
    if (prefix === "engage.cloudflareclient.com") {
        return `${prefix}:${port}`;
    } else {
		const maxNum = (prefix === "162.159.192.") ? 20 : 10;
		const randomNumber = Math.floor(Math.random() * maxNum) + 1;
        return `${prefix}${randomNumber}:${port}`;
    }
}

// Генерация I1/I2 через DOH Cloudflare
async function generateI1I2(domain) {
    if (!domain) domain = 'www.google.com';

    // Создаём DNS запрос типа A
    const requestBuf = dnsPacket.encode({
        type: 'query',
        id: Math.floor(Math.random() * 65535),
        flags: dnsPacket.RECURSION_DESIRED,
        questions: [{
            type: 'A',
            name: domain
        }]
    });

    // Отправляем через DOH Cloudflare
    const dohResponse = await fetch('https://cloudflare-dns.com/dns-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/dns-message' },
        body: requestBuf
    });

    if (!dohResponse.ok) {
        throw new Error(`DOH error: ${dohResponse.status}`);
    }

    const responseBuf = Buffer.from(await dohResponse.arrayBuffer());

    // Декодируем ответ, оставляем только первую A запись
    const decoded = dnsPacket.decode(responseBuf);
    const aAnswers = decoded.answers.filter(ans => ans.type === 'A');
    if (aAnswers.length === 0) {
        throw new Error('No A records found');
    }

    // Создаём новый ответ только с первой A записью
    const newResponse = {
        type: 'response',
        id: decoded.id,
        flags: decoded.flags,
        questions: decoded.questions,
        answers: [aAnswers[0]]
    };
    const newResponseBuf = dnsPacket.encode(newResponse);

    // Преобразуем в hex (с удалением двух байтов)
    const i1Hex = requestBuf.toString('hex', 2);
    const i2Hex = newResponseBuf.toString('hex', 2);

    return { i1: i1Hex, i2: i2Hex };
}

// Основная генерация конфига
async function generateWarpConfig(domain, dns = "8.8.8.8, 2001:4860:4860::8888, 8.8.4.4, 2001:4860:4860::8844", allowedIPs = "0.0.0.0/0, ::/0") {
    const { privKey, pubKey } = generateKeys();

    // Регистрация в Cloudflare Warp
    const regBody = {
        install_id: "",
        tos: new Date().toISOString(),
        key: pubKey,
        fcm_token: "",
        type: "ios",
        locale: "en_US"
    };
    const regResponse = await apiRequest('POST', 'reg', regBody);
    const id = regResponse.result.id;
    const token = regResponse.result.token;

    // Включение Warp
    const warpResponse = await apiRequest('PATCH', `reg/${id}`, { warp_enabled: true }, token);

    const peer_pub = warpResponse.result.config.peers[0].public_key;
    const client_ipv4 = warpResponse.result.config.interface.addresses.v4;
    const client_ipv6 = warpResponse.result.config.interface.addresses.v6;

    // Генерация I1/I2 на основе домена
    const { i1, i2 } = await generateI1I2(domain);
    const randomEndpoint = generateRandomEndpoint();

    const conf = `[Interface]
PrivateKey = ${privKey}
Jc = 4
Jmin = 40
Jmax = 70
H1 = 1
H2 = 2
H3 = 3
H4 = 4
I1 = <r 2><b 0x${i1}>
I2 = <r 2><b 0x${i2}>
Address = ${client_ipv4}, ${client_ipv6}
DNS = ${dns}
MTU = 1280

[Peer]
PublicKey = ${peer_pub}
AllowedIPs = ${allowedIPs}
Endpoint = ${randomEndpoint}`;

    return conf;
}

// Публичная функция – возвращает base64 готового конфига
async function getWarpConfigLink(domain, dns, allowedIPs) {
    try {
        const conf = await generateWarpConfig(domain, dns, allowedIPs);
        return Buffer.from(conf).toString('base64');
    } catch (error) {
        console.error('Ошибка генерации:', error);
        return null;
    }
}

module.exports = { getWarpConfigLink };