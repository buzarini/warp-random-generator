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
I1 = <b 0xca00000001087d88db559f714bd8000044d0ec3605fc3cfcea99f4df0d354264aea06b9fd970c843806081109629b62d82177c3bb43e0931f42bc3cc8365cd342543c08e8dd724ab76f68aaaa7084ae395be4babd27ca1872840ef655b5803b8a97a0b6e08efb407b2591e3308a8e784bb6cf716a2f85f2eee1114e01f0e7ec64922473bdbed2395bc055f7a03dc98700a3b85128e2f2c126303ce6998aa4f3f74609a14c1a7f4546aa3dcc26aa1cdfba713fc4d9123d196b2ea1ff814e43719414a0775245c2ea4a30034132c16972626c05e41958effbc6bbf8869a31bf2f39fc9bddcb903e666af117989a1ea3ff0b528be4672a9aeeb5cd160f12c0fd2fcb9b9eabe9f0731b49008b5a1176c1468e6bdd0818f12b5441dd7fbd20b83801d77a73b2647b31bba51ef4033dd279603be14b78f1c97c0748fc24d951400b4a46086a7defb74ec58e627c036e3a21bc4e6213059de156713e008c4ee75171e4e35a48db41c3057858c3cfc25dc74948acb6776d0fa620c86f2d57043c0c29bf5b065937d7dabed82870a1d1bd278deb7fe20f18e0242e85e4da75b16edefb582aa4bd1e20f6d231560410084c6d18b5112bdb1f427407721cd1dee556d59b09bd7a1ecaa27c0b5abd9d25f4a527f3d46fb1f5fb9c6572f6ab44bb6cbb636990475e750b668325068a956adfb05a0995ddae09f1001e2fe64e78bb5ce785a52e16d281e982da3ac3d53d64abcc1b7b1fbdd3df2fbde5ef6c3996261cca2de81ffbb5b22894e23e2214c01677f4f5b83dfc62152b346cbd7eef836a51427352aa2fd156f0bba2a73fdd2a295c0e12aeabf33211260ea54e41af757b3442d9cb5c8cef9b12292b4e003f4fd8d3fc3c956666fcf5566d566efb7fee9c88becc40c401a456681d7d518bb46eb46debf5e0e8c03d4e3591b4d87c40c714141e30456574f871eb2fbd5a10eb4635d314ba888e2b79ecd14e873fadfe58aee720d4df9d4a0243cf2a41856cefb8fd14b474aa8eeecb52f5c3f2ea709f316ee904e53dcb9f55cbca7d4f0e24913fce5c25a9994662b78566f6a86cddb2918d82f3f892901187f3ded8f43eb53111e38bc69fbe2f117ea1de62f62a4c7432e66c2f938df653f50fe11c6b78e69214db62b09e0e1fe75de67dc69e3d03d2a0ef4dad4a4534fdc02bce83f6d15395fbdbee46435705cb13e02abf2f351271c8bf57a03d8eb9756ba0230784b8c1024e9246000c54b2e3dbcbd8a25bbd1d2193fe30503ed6cb8fd6944d2edb3689da929cc1a5b934707efb277b655d98fd1d42fe4e1cdc06f8ee5b01031518f8c3f486ec1f2480b5436bc89b61260e6efc27dffd03527d80163385484719d37f10cc5a8c8d1bd2fb40e821c27446e70db2f6e969ba8ede149c3a0268fba9fe24f0ac6024fc34738060bc67151e3514ad1f687ae35101b9f077c3e0bcec1517c88c12792a1b5be426783a5ee7defad3198c82ce00cf4dea1c8b3622a0fcbe7d8a4db5fef608bac7720c8d485b67bf608212dd51485ac9afaa12088575a6b3b355c67dce2e89ac4a60a50705e8beb161b71ea6d5150cd10dcf5c1fe6ea592f0245e343ca2f1a09342e3facf8669d162052681de7aca32d97e984958247f178f726c1d95a8c4988925719f8914fefe53242807bb37b26954051c42198d323dd8adb49e82f3a119a66a828cfa3dba51e49cb62e7c5eaf60b60595a3cf1b84f3323e5ac4ce2f54b8f92d4070d4e08fa07d3e3544b13fbbc156fc45deadd8>
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
