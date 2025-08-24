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
        { prefix: "162.159.192.", min: 1, max: 20 }
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

async function generateWarpConfig(dns = "1.1.1.1, 2606:4700:4700::1111, 1.0.0.1, 2606:4700:4700::1001", allowedIPs = "0.0.0.0/0, ::/0") {
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

    const randomEndpoint = generateRandomEndpoint();

    const conf = `[Interface]
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
I1 = <b 0xc500000001088693fd80977b898a000044d0842a5855ce9462a5714fe21e13dd790440b6dc030722f4cf82ea33863e2135ce942176b9dfa637de9d843728beb77c44737f7b5311ecc21df75262cda0cecef9e47904bff65aba959c5734e7e387387fdcb809e04e3eda944ee53c259dc6f4c0806ae02a40c01c73f3f09e53e99863e8a6a39e08cbeb31cfd478a21b173b8fbd21cd8979f1a5681b9b71402b95e899477ec040a5969a83999e01aacbe8d78edb198d3f162159619d6433a359fd5a6112ae70f6ab3e3443c244b6e89fe85e9b40c34e83a3005a7d14a3994f5f857bd0c7307e5da94145041e78ca4fded56fdd8cbd7d43adfa47f4d6aa07dad3139b1188782b1db982ec4729f16c02e4aba9a3347374fdb047f37627d12f086fe5a0b4fa3c243ccb935879e430b766b8bcf185c9244be27f69bdc5e53e6452bf26ab65b29378f9fe8e6d7633120d247e648e3934f4319b90000f1f21b832839aaa149ab280216e0e8ca391fa3690de7b8ea5d3b02890baf209cda62a3267a845d3dcd62f0c90146ff44365b4a3c216dc2b5b518ae2fc96ac342fc1bd53c62f70fff8339d220e34e34c449eb47bd4ce94068be06261d3d46d28bf47ddab00ce00cb8b34a34fedbc005e3669e24cb41f22090eadcb47f4a351fd383d6d2317972bd04e74b3c21fae31efda18dbeea733049f59d6c7d5ef01034764a19acafa858f309fb250cb4bb001514a7f26b7826f065dd6ca5085b4ee0700c4c41a8d99eb8cfaecd717aba4a678c2f0e35408d1b812b8c32271a76595de526fbb40fc8590af9a32a4e95836623b70fc9ecaef265a15161e3a18ebfedef28b2e83aca50fe8ffb714bb6c66689e0308fe75b010937410cb4076913809ef2fe3555986ee3b22e19a63fa026a87128a1fc2fcf768acfe64f7b7c8b16dab38852852a677b201e6780a79ec43c9920b0101e3e4389590b1fbb86757d4539c8abc12b8aed7585c8cc7d78e56dc2dabdb4e8f814085653cecb29c420e322ce8b5b186f2b7f0875126a015aba2d2cc077787123e91c92325a556be0be7258ddfc6c1d45386afb5615b062a886c0e5bee2750c0b2b6c2bbf47b4720cbcc7a78d395d61a458fd065c6f348f620dbe294237fe27d96b23ff9ea80003e9e0c8c947091a69ee30396f7afea3f4520e55fec86659f31309071bc7170cc00f9c59591a3788059d14e4495db789f6b9162ba1ef9006c5fb95c09b54f0e1a6eea25875e6d30f2eb51bf4237fabb5ff1f3d0a381ed4ac0096034ca29c596c0db162314d857171fddcc6231f267d559c1b52ca7ab802a63a85f6ef3b421bc04bcb2b98d94ed981a91736c83babf5192abb0b4bf9d4deb55aafc968ee044b567ad75a253c2aac2ad0ee0f137c46079fe760b74f7667b86970115310be32ed62385985de7d6bb0530d509edfe1347cdf4602d428ad2ac8e47892c24c32b3bcd4e9654d8a08c4121e8204d13c3a847d3559a35a2fd4d49f9018b0ee2adb9f3be6577b339a085bf1d00634b9430372c28d4f536a9f0d00fa1f7b6c4834ba36c8d70f2819257d91a5d3d37c5d0aa1983e97a7d4cc3f9d97435d8f1e43a9b11320de3b52896a78c00b986f4b5541718fcefcd08403284e7cbd27e0439084b2ce61275ec2991d3e7b1ab924ce4aa490e8dc3debac146d31a9c5831bdeb3c70010268dcef9f91fd78ac4c064264a4cc9820216f29a7c052042ea3c6a1b7b92371bba5027066e2be497c45e56cf1baf22a7a79ab463ba7de>
MTU = 1280
Address = ${client_ipv4}, ${client_ipv6}
DNS = ${dns}

[Peer]
PublicKey = ${peer_pub}
AllowedIPs = ${allowedIPs}
Endpoint = ${randomEndpoint}`;

    return conf;
}

async function getWarpConfigLink(dns, allowedIPs) {
    try {
        const conf = await generateWarpConfig(dns, allowedIPs);
        const confBase64 = Buffer.from(conf).toString('base64');
        return `${confBase64}`;
    } catch (error) {
        console.error('Ошибка при генерации конфига:', error);
        return null;
    }
}

module.exports = { getWarpConfigLink };
