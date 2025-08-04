const fetch = require('node-fetch');
const nacl = require('tweetnacl');
const { Buffer } = require('buffer');

// Общие константы (такие же как в AWGr.js)
const PORTS = [500, 854, 859, 864, 878, 880, 890, 891, 894, 903, 908, 928, 934, 939, 942, 943, 945, 946, 955, 968, 987, 988, 1002, 1010, 1014, 1018, 1070, 1074, 1180, 1387, 1701, 1843, 2371, 2408, 2506, 3138, 3476, 3581, 3854, 4177, 4198, 4233, 4500, 5279, 5956, 7103, 7152, 7156, 7281, 7559, 8319, 8742, 8854, 8886];
const JC_PARAMS_OPTIONS = ["Jc = 4\nJmin = 40\nJmax = 70", "Jc = 120\nJmin = 23\nJmax = 911"];

// Общие функции (можно вынести в отдельный модуль утилит)
function generateKeys() {
    const keyPair = nacl.box.keyPair();
    return {
        privKey: Buffer.from(keyPair.secretKey).toString('base64'),
        pubKey: Buffer.from(keyPair.publicKey).toString('base64')
    };
}

function generateRandomEndpoint(prefixes) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNumber = Math.floor(Math.random() * 256);
    const port = PORTS[Math.floor(Math.random() * PORTS.length)];
    return `${prefix}${randomNumber}:${port}`;
}

function getRandomJcParams() {
    return JC_PARAMS_OPTIONS[Math.floor(Math.random() * JC_PARAMS_OPTIONS.length)];
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

    const response = await fetch(`https://api.cloudflareclient.com/v0i1909051800/${endpoint}`, options);
    return response.json();
}

// Основная функция генерации конфига для Throne
async function generateThroneConfig(prefixes, suffix) {
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
    
    const privateKey = privKey.replace(/=$/, '');
    const reserved64 = warpResponse.result.config.client_id;
    const reservedHex = Buffer.from(reserved64, 'base64').toString('hex');
    const reservedDec = reservedHex.match(/.{1,2}/g).map(hex => parseInt(hex, 16)).join('-');
    
    const jcParams = getRandomJcParams();
    const jcValues = jcParams.split('\n').reduce((acc, line) => {
        const [key, value] = line.split(' = ');
        acc[key] = value;
        return acc;
    }, {});

    return `wg://${generateRandomEndpoint(prefixes)}?private_key=${privateKey}%3D&peer_public_key=bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo%3D&pre_shared_key=&reserved=${reservedDec}&persistent_keepalive=0&mtu=1280&use_system_interface=false&local_address=${client_ipv4}/32-${client_ipv6}/128&workers=0&enable_amenzia=true&junk_packet_count=${jcValues['Jc']}&junk_packet_min_size=${jcValues['Jmin']}&junk_packet_max_size=${jcValues['Jmax']}&init_packet_junk_size=0&response_packet_junk_size=0&init_packet_magic_header=1&response_packet_magic_header=2&underload_packet_magic_header=3&transport_packet_magic_header=4${suffix}`;
}

// Функции для разных префиксов
async function getThroneConfigWithPrefixes(prefixes, suffix) {
    try {
        const conf = await generateThroneConfig(prefixes, suffix);
        return Buffer.from(conf).toString('base64');
    } catch (error) {
        console.error('Ошибка при генерации конфига:', error);
        return null;
    }
}

async function getWarpConfigLink4() {
    return getThroneConfigWithPrefixes(["8.47.69.", "8.6.112."], "#WARPr8");
}

async function getWarpConfigLink5() {
    return getThroneConfigWithPrefixes(["162.159.192.", "162.159.195."], "#WARPr162");
}

async function getWarpConfigLink6() {
    return getThroneConfigWithPrefixes(["188.114.96.", "188.114.97.", "188.114.98.", "188.114.99."], "#WARPr188");
}

module.exports = {
    getWarpConfigLink4,
    getWarpConfigLink5,
    getWarpConfigLink6
};
