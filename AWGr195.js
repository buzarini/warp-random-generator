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
I1 = <b 0xcf000000010882ebbff338534fb9000044d045a5a4faa69113c87f0aa7795ed39fa02c92addf3b5ace2bdf9546408ed9b1b304889c804a080753d07d80b1507239e7f072c120f43efc3fcd42b51735accacc8a6bd93f0b7d1200205fbb71d61e6a76c29b44c2684a7186e752170d91a75e799567ef75ff40c5db35242a26d6c693d63b25f491495610ef9186996519ed34b1f4322699d7f77198aa1dbde1ae953d4f6fcd375f35cdce477874d110565f3a1e6cc46275a64bb3b5f7a1d9565370f8ebbb6b012d2e9da8f940e341f808422fd5da0ebccd41fca6c47f0c3130ae9a1fe582b411040b3d2b22d0e862815c9257405a31a2112da5bdd435e4fcb8d6a926b9ce1910e63019b832190c2463951d0f7e90012c286277f5f2d65b923871fdb56600d201be1a46e6123a407c5fa96ec07332571c3ed5fcac6ef73fde36ccd9bfc84e1a63551c3499d53f6fd8021600b908a41f2b8ce0ff4fe71eb00663a46197a3e82980e5f0743b01b345458f1f317745ad1002b9fdd58b79d9e1f5c9c6489b9fd3793045ae0d0e04e39ee058533e6b3951e4aed507d5db64113a92aad8fda48778ddf3287f16a517fc70f937bce94b06e848ca73316d722a5afd485af8f285816ef3abf33917a471330811e8f8749eb75e70c1f242923e01e48d1505a1e31701a9619256af74cdf34067f04d55140b3a73e96952fab571cad6ff3265f5149b971aeb87a41afc3385c76917b1b8d10c79132f6d6e5009103836ab998c0ed70aa741bbfc7d6973a92a7017478ff5537d83f5fe8e6e07435d16bb21956112f1d8ad020b7c99302d8a28eab14b7d4113d27626fc3bdb4584d777cdc77208f91f0540f6e7c18d11076ba5fdfcd2f55bd75bac0129565f4e3a29b713f98ecb05e35f3961ab11a7bc93c33617cba899053fbb4a383c10cd8da76aa2cd84cf74e5675191ca74b274a1cd73d80a25eaaa419f3b8efbf1cdbbcfb762cf3c2ce342d6fd73809cbc611c513dd0654c802215caa1499de39e9835f9c7c7f8fc35fafa87de836bb86865f071566dd12ae70c378e0a53a14fee9b85fc4f7df0463c860b235b9bd0407d3f46a589e33443d4a40a438005b52f36b43a2a64b0059d09e2a97c0ae106f1c2c57d75e54031cd818780e49da987274a462a19d2c3a4b93d08bc08993894f5f45b37df5c572c269aa583e18c5c8d21212610cb40a771ac90d24e20e7232bc27c7e3b14faa243886049d99a1e5b0fdc4dfca78747fdb9215c8c07c8911062731cfe8dffb3f8c838cc05cf56c205c499a9b09e02f4e59b808a54cd2e86302dd1b3616bfe47b2e1ed60faf4a297692e4b95b45c777268b839000101896d96e796592e81b776b59dd576f42657ca99bdaf8f922eae3eec97118d59f619ba1ff109da90f91f889586c0c8b6f01284170fc68dad3284ed7833a44ab52d15204152244fa0ba9023bba1905ef1c6af28961aee97d3eba2920a818a042c79e356f0e12d9e5f1e70778f48d425cc74669d7f03ed14fefc438a3669ed4242023726a1be92dddf5df3b21506568467fa240155846a306472c7e2660855674b47f30ea61f127df0a2abde572d19ad990f47ba45a6d43b076403890d39510c17cf9a3f12131b1b4fb41df334a54f0473c83748e79990a78a915533710cb96f8384a5c3e2be9334619c649b48501d99e08f882991c5f9e8b1370264c27f46806401ccd55a1b4c57c85af34c9193d5c4eee41b19afd6e1ba4042aebd639440f25a4a57667a9e>
MTU = 1280
Address = ${client_ipv4}, ${client_ipv6}
DNS = ${dns}

[Peer]
PublicKey = ${peer_pub}
AllowedIPs = ${allowedIPs}
Endpoint = ${randomEndpoint}`;

    return conf;
}

async function getWarpConfigLink2(dns, allowedIPs) {
    try {
        const conf = await generateWarpConfig(dns, allowedIPs);
        const confBase64 = Buffer.from(conf).toString('base64');
        return `${confBase64}`;
    } catch (error) {
        console.error('Ошибка при генерации конфига:', error);
        return null;
    }
}

module.exports = { getWarpConfigLink2 };
