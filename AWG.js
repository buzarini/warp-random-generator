const fetch = require('node-fetch');
const nacl = require('tweetnacl');
const { Buffer } = require('buffer');

// Конфигурация
const ENDPOINT_CONFIG = {
    prefixes: ["162.159.192.", "162.159.195.", "engage.cloudflareclient.com"],
    ports: [500, 854, 859, 864, 878, 880, 890, 891, 894, 903, 908, 928, 934, 939, 942, 943, 945, 946, 955, 968, 987, 988, 1002, 1010, 1014, 1018, 1070, 1074, 1180, 1387, 1701, 1843, 2371, 2408, 2506, 3138, 3476, 3581, 3854, 4177, 4198, 4233, 4500, 5279, 5956, 7103, 7152, 7156, 7281, 7559, 8319, 8742, 8854, 8886],
    ranges: {
        "162.159.192.": { min: 1, max: 20 },
        "162.159.195.": { min: 1, max: 10 }
    }
};

const API_BASE_URL = 'https://api.cloudflareclient.com/v0i1909051800';

// Вспомогательные функции
function generateRandomEndpoint() {
    const { prefixes, ports, ranges } = ENDPOINT_CONFIG;
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const port = ports[Math.floor(Math.random() * ports.length)];
    
    if (prefix === "engage.cloudflareclient.com") {
        return `${prefix}:${port}`;
    }
    
    const range = ranges[prefix];
    const randomNum = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    return `${prefix}${randomNum}:${port}`;
}

function generateKeys() {
    const keyPair = nacl.box.keyPair();
    return {
        privKey: Buffer.from(keyPair.secretKey).toString('base64'),
        pubKey: Buffer.from(keyPair.publicKey).toString('base64')
    };
}

function createDnsQuery(domain) {
    // Проверка домена
    if (!domain || typeof domain !== 'string' || !domain.includes('.')) {
        domain = 'www.google.com';
    }
    
    const parts = domain.split('.');
    let query = '';
    
    parts.forEach(part => {
        query += String.fromCharCode(part.length) + part;
    });
    
    query += '\x00\x00\x01\x00\x01';
    return query;
}

async function generateDnsOverHttpsQuery(domain) {
    try {
        // Проверка домена
        if (!domain || typeof domain !== 'string' || !domain.includes('.')) {
            domain = 'www.google.com';
        }
        
        const transactionId = Math.floor(Math.random() * 65536).toString(16).padStart(4, '0');
        const dnsQuery = createDnsQuery(domain);
        
        // DoH запрос
        const dohResponse = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
        const dohData = await dohResponse.json();
        
        // Формируем базовый ответ
        let dnsAnswer = transactionId + '81800001' +
                      (dohData.Answer?.length.toString(16).padStart(4, '0') || '0000') +
                      '00000000' + Buffer.from(dnsQuery, 'binary').toString('hex');
        
        // Добавляем ответы A-записей
        if (dohData.Answer) {
            dohData.Answer.forEach(answer => {
                if (answer.type === 1) {
                    const ttl = (answer.TTL || 300).toString(16).padStart(8, '0');
                    const ipHex = answer.data.split('.').map(p => 
                        parseInt(p).toString(16).padStart(2, '0')
                    ).join('');
                    
                    dnsAnswer += 'c00c00010001' + ttl + '0004' + ipHex;
                }
            });
        }
        
        return {
            query: transactionId + '01000001000000000000' + Buffer.from(dnsQuery, 'binary').toString('hex'),
            answer: dnsAnswer
        };
        
    } catch (error) {
        console.error('Ошибка при генерации DNS запроса:', error);
        return {
            query: '91bb010000010000000000000377777706676f6f676c6503636f6d0000010001',
            answer: '91bb818000010006000000000377777706676f6f676c6503636f6d0000010001c00c00010001000000060004acfd3e6ac00c00010001000000060004acfd3e67c00c00010001000000060004acfd3e63c00c00010001000000060004acfd3e68c00c00010001000000060004acfd3e93c00c00010001000000060004acfd3e69'
        };
    }
}

async function apiRequest(method, endpoint, body = null, token = null) {
    const headers = {
        'User-Agent': '',
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };

    const options = {
        method,
        headers,
        ...(body && { body: JSON.stringify(body) })
    };

    const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
    return response.json();
}

async function generateWarpConfig(dns, allowedIPs, domain) {
    try {
        const { privKey, pubKey } = generateKeys();
        const dnsData = await generateDnsOverHttpsQuery(domain);
        
        // Регистрация
        const regBody = {
            install_id: "",
            tos: new Date().toISOString(),
            key: pubKey,
            fcm_token: "",
            type: "ios",
            locale: "en_US"
        };
        
        const regResponse = await apiRequest('POST', 'reg', regBody);
        const { id, token } = regResponse.result;
        
        // Активация WARP
        const warpResponse = await apiRequest('PATCH', `reg/${id}`, { warp_enabled: true }, token);
        const { config } = warpResponse.result;
        const { public_key: peerPub, endpoint } = config.peers[0];
        const { v4: clientIPv4, v6: clientIPv6 } = config.interface.addresses;
        
        // Генерация конфига
        return `[Interface]
PrivateKey = ${privKey}
Jc = 4
Jmin = 40
Jmax = 70
H1 = 1
H2 = 2
H3 = 3
H4 = 4
I1 = <b 0x${dnsData.query}>
I2 = <b 0x${dnsData.answer}>
Address = ${clientIPv4}, ${clientIPv6}
DNS = ${dns}
MTU = 1280

[Peer]
PublicKey = ${peerPub}
AllowedIPs = ${allowedIPs}
Endpoint = ${generateRandomEndpoint()}`;
        
    } catch (error) {
        console.error('Ошибка при генерации конфига WARP:', error);
        throw error;
    }
}

async function getWarpConfigLink1(dns, allowedIPs, domain) {
    try {
        const conf = await generateWarpConfig(dns, allowedIPs, domain);
        return Buffer.from(conf).toString('base64');
    } catch (error) {
        console.error('Ошибка при генерации конфига:', error);
        return null;
    }
}

module.exports = { getWarpConfigLink1 };
