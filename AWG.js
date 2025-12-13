const fetch = require('node-fetch');
const nacl = require('tweetnacl');
const { Buffer } = require('buffer');

// Константы вынесены для лучшей читаемости
const PREFIXES = ["162.159.192.", "162.159.195.", "engage.cloudflareclient.com"];
const PORTS = [4500, 2408, 1701, 500];
const PREFIX_RANGES = {
    "162.159.192.": 20,
    "162.159.195.": 10
};

// Кэширование для часто используемых значений
const API_BASE_URL = 'https://api.cloudflareclient.com/v0i1909051800';
const DEFAULT_HEADERS = {
    'User-Agent': '',
    'Content-Type': 'application/json',
};

function generateRandomEndpoint() {
    const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    const port = PORTS[Math.floor(Math.random() * PORTS.length)];

    if (prefix === "engage.cloudflareclient.com") {
        return `${prefix}:${port}`;
    }

    const maxRange = PREFIX_RANGES[prefix] || 10;
    const randomNumber = Math.floor(Math.random() * maxRange) + 1;
    return `${prefix}${randomNumber}:${port}`;
}

function generateKeys() {
    const keyPair = nacl.box.keyPair();
    return {
        privKey: Buffer.from(keyPair.secretKey).toString('base64'),
        pubKey: Buffer.from(keyPair.publicKey).toString('base64')
    };
}

async function apiRequest(method, endpoint, body = null, token = null) {
    const headers = { ...DEFAULT_HEADERS };
    
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const options = {
        method,
        headers,
        ...(body && { body: JSON.stringify(body) })
    };

    const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
    
    if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
}

function generateConfigTemplate(privKey, peerPub, randomEndpoint, clientIPv4, clientIPv6, dns, allowedIPs) {
    return `[Interface]
PrivateKey = ${privKey}
S1 = 0
S2 = 0
Jc = 4
Jmin = 40
Jmax = 70
H1 = 1
H2 = 2
H3 = 3
H4 = 4
I1 = <b 0x5C5F010000010000000000000377777706676F6F676C6503636F6D0000010001>
I2 = <b 0x5C5F818000010006000000000377777706676F6F676C6503636F6D0000010001C00C000100010000012C000440E9A169C00C000100010000012C000440E9A163C00C000100010000012C000440E9A168C00C000100010000012C000440E9A16AC00C000100010000012C000440E9A193C00C000100010000012C000440E9A167>
MTU = 1280
Address = ${clientIPv4}, ${clientIPv6}
DNS = ${dns}

[Peer]
PublicKey = ${peerPub}
AllowedIPs = ${allowedIPs}
Endpoint = ${randomEndpoint}`;
}

async function generateWarpConfig(
    dns = "1.1.1.1, 2606:4700:4700::1111, 1.0.0.1, 2606:4700:4700::1001", 
    allowedIPs = "0.0.0.0/0, ::/0"
) {
    try {
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

        const warpResponse = await apiRequest('PATCH', `reg/${id}`, 
            { warp_enabled: true }, token);

        const { config } = warpResponse.result;
        const peer = config.peers[0];
        const { addresses } = config.interface;

        const randomEndpoint = generateRandomEndpoint();
        
        return generateConfigTemplate(
            privKey,
            peer.public_key,
            randomEndpoint,
            addresses.v4,
            addresses.v6,
            dns,
            allowedIPs
        );
    } catch (error) {
        console.error('Error generating Warp config:', error);
        throw error;
    }
}

async function getWarpConfigLink1(dns, allowedIPs) {
    try {
        const conf = await generateWarpConfig(dns, allowedIPs);
        return Buffer.from(conf).toString('base64');
    } catch (error) {
        console.error('Configuration generation error:', error);
        return null;
    }
}

module.exports = { getWarpConfigLink1 };
