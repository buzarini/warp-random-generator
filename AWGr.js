const fetch = require('node-fetch');
const nacl = require('tweetnacl');
const { Buffer } = require('buffer');

// Общие константы
const PORTS = [500, 854, 859, 864, 878, 880, 890, 891, 894, 903, 908, 928, 934, 939, 942, 943, 945, 946, 955, 968, 987, 988, 1002, 1010, 1014, 1018, 1070, 1074, 1180, 1387, 1701, 1843, 2371, 2408, 2506, 3138, 3476, 3581, 3854, 4177, 4198, 4233, 4500, 5279, 5956, 7103, 7152, 7156, 7281, 7559, 8319, 8742, 8854, 8886];
const JC_PARAMS_OPTIONS = ["Jc = 4\nJmin = 40\nJmax = 70", "Jc = 120\nJmin = 23\nJmax = 911"];

// Генерация ключей
function generateKeys() {
    const keyPair = nacl.box.keyPair();
    return {
        privKey: Buffer.from(keyPair.secretKey).toString('base64'),
        pubKey: Buffer.from(keyPair.publicKey).toString('base64')
    };
}

// Генерация случайного endpoint
function generateRandomEndpoint(prefixes) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNumber = Math.floor(Math.random() * 256);
    const port = PORTS[Math.floor(Math.random() * PORTS.length)];
    return `${prefix}${randomNumber}:${port}`;
}

function getRandomJcParams() {
    return JC_PARAMS_OPTIONS[Math.floor(Math.random() * JC_PARAMS_OPTIONS.length)];
}

// API запрос
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

    const response = await fetch(`https://api.cloudflareclient.com/v0i1909051800/${endpoint}`, options);
    return response.json();
}

// Основная функция генерации конфига
async function generateWarpConfig(dns, allowedIPs, prefixes) {
    const { privKey, pubKey } = generateKeys();
    
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
    
    const warpResponse = await apiRequest('PATCH', `reg/${id}`, { warp_enabled: true }, token);
    const { public_key: peer_pub } = warpResponse.result.config.peers[0];
    const { v4: client_ipv4, v6: client_ipv6 } = warpResponse.result.config.interface.addresses;
    
    const conf = `[Interface]
PrivateKey = ${privKey}
S1 = 0
S2 = 0
${getRandomJcParams()}
H1 = 1
H2 = 2
H3 = 3
H4 = 4
MTU = 1280
Address = ${client_ipv4}, ${client_ipv6}
DNS = ${dns}

[Peer]
PublicKey = ${peer_pub}
AllowedIPs = ${allowedIPs}
Endpoint = ${generateRandomEndpoint(prefixes)}`;

    return conf;
}

// Функции для разных префиксов
async function getConfigWithPrefixes(prefixes, dns, allowedIPs) {
    try {
        const conf = await generateWarpConfig(dns, allowedIPs, prefixes);
        return Buffer.from(conf).toString('base64');
    } catch (error) {
        console.error('Ошибка при генерации конфига:', error);
        return null;
    }
}

async function getWarpConfigLink(dns, allowedIPs) {
    return getConfigWithPrefixes(["8.47.69.", "8.6.112."], dns, allowedIPs);
}

async function getWarpConfigLink2(dns, allowedIPs) {
    return getConfigWithPrefixes(["162.159.192.", "162.159.195."], dns, allowedIPs);
}

async function getWarpConfigLink3(dns, allowedIPs) {
    return getConfigWithPrefixes(["188.114.96.", "188.114.97.", "188.114.98.", "188.114.99."], dns, allowedIPs);
}

module.exports = {
    getWarpConfigLink,
    getWarpConfigLink2,
    getWarpConfigLink3
};
