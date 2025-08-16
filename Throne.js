const fetch = require('node-fetch');
const nacl = require('tweetnacl');
const { Buffer } = require('buffer');

function generateKeys() {
    const keyPair = nacl.box.keyPair();
    return {
        privKey: Buffer.from(keyPair.secretKey).toString('base64'),
        pubKey: Buffer.from(keyPair.publicKey).toString('base64')
    };
}

function generateRandomEndpoint() {
    const ranges = [
        { prefix: "162.159.192.", min: 1, max: 20 },
        { prefix: "162.159.195.", min: 1, max: 10 }
    ];
    const ports = [4500, 2408, 1701, 500];

    const range = ranges[Math.floor(Math.random() * ranges.length)];
    const randomNumber = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    const port = ports[Math.floor(Math.random() * ports.length)];

    return `${range.prefix}${randomNumber}:${port}`;
}

async function apiRequest(method, endpoint, body = null, token = null) {
    const headers = {
        'User-Agent': '',
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers,
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`https://api.cloudflareclient.com/v0i1909051800/${endpoint}`, options);
    return response.json();
}

async function generateWarpConfig() {
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

    const id = regResponse.result.id;
    const token = regResponse.result.token;

    const warpResponse = await apiRequest('PATCH', `reg/${id}`, { warp_enabled: true }, token);

    const peer_pub = warpResponse.result.config.peers[0].public_key;
    const peer_endpoint = warpResponse.result.config.peers[0].endpoint.host;
    const client_ipv4 = warpResponse.result.config.interface.addresses.v4;
    const client_ipv6 = warpResponse.result.config.interface.addresses.v6;
    const privateKey = privKey.replace(/=$/, '');
    const reserved64 = warpResponse.result.config.client_id;
    const reservedHex = Buffer.from(reserved64, 'base64').toString('hex');
    const reservedDec = reservedHex.match(/.{1,2}/g).map(hex => parseInt(hex, 16)).join('-');
	
    const randomEndpoint = generateRandomEndpoint();

    const conf = `wg://${randomEndpoint}?private_key=${privateKey}%3D&peer_public_key=bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo%3D&pre_shared_key=&reserved=${reservedDec}&persistent_keepalive=0&mtu=1280&use_system_interface=false&local_address=${client_ipv4}/32-${client_ipv6}/128&workers=0&enable_amnezia=true&junk_packet_count=4&junk_packet_min_size=40&junk_packet_max_size=70&init_packet_junk_size=0&response_packet_junk_size=0&init_packet_magic_header=1&response_packet_magic_header=2&underload_packet_magic_header=3&transport_packet_magic_header=4#WARP`;

    return conf;
}

async function getWarpConfigLink9() {
    try {
        const conf = await generateWarpConfig();
        const confBase64 = Buffer.from(conf).toString('base64');
        return `${confBase64}`;
    } catch (error) {
        console.error('Ошибка при генерации конфига:', error);
        return null;
    }
}

module.exports = { getWarpConfigLink9 };
