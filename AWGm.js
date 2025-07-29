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

async function apiRequest(method, endpoint, body = null, token = null) {
    const headers = {
        'User-Agent': 'Mozilla/5.0',
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

    try {
        const response = await fetch(`https://api.cloudflareclient.com/v0a1900/${endpoint}`, options);
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

async function generateWarpConfig(dns = "1.1.1.1, 1.0.0.1, 2606:4700:4700::1111, 2606:4700:4700::1001", allowedIPs = "0.0.0.0/0, ::/0") {
    try {
        const { privKey, pubKey } = generateKeys();

        // Register device
        const regBody = {
            install_id: "",
            tos: new Date().toISOString(),
            key: pubKey,
            fcm_token: "",
            type: "ios",
            locale: "en_US"
        };
        
        const regResponse = await apiRequest('POST', 'reg', regBody);
        
        if (!regResponse.success) {
            throw new Error('Registration failed: ' + JSON.stringify(regResponse));
        }

        const id = regResponse.result.id;
        const token = regResponse.result.token;

        // Enable WARP
        const warpResponse = await apiRequest('PATCH', `reg/${id}`, { warp_enabled: true }, token);
        
        if (!warpResponse.success) {
            throw new Error('WARP enable failed: ' + JSON.stringify(warpResponse));
        }

        // Validate response structure
        if (!warpResponse.result.config || 
            !warpResponse.result.config.peers || 
            !warpResponse.result.config.peers[0] || 
            !warpResponse.result.config.interface) {
            throw new Error('Invalid response structure from Cloudflare API');
        }

        const peer_pub = warpResponse.result.config.peers[0].public_key;
        const peer_endpoint = warpResponse.result.config.peers[0].endpoint.host;
        const client_ipv4 = warpResponse.result.config.interface.addresses.v4;
        const client_ipv6 = warpResponse.result.config.interface.addresses.v6;

        // Generate config
        const conf = `[Interface]
PrivateKey = ${privKey}
Address = ${client_ipv4}, ${client_ipv6}
DNS = ${dns}

[Peer]
PublicKey = ${peer_pub}
AllowedIPs = ${allowedIPs}
Endpoint = ${peer_endpoint}:2408`;

        return conf;
    } catch (error) {
        console.error('Error in generateWarpConfig:', error);
        throw error;
    }
}

async function getWarpConfigLink6(dns, allowedIPs) {
    try {
        const conf = await generateWarpConfig(dns, allowedIPs);
        const confBase64 = Buffer.from(conf).toString('base64');
        return confBase64;
    } catch (error) {
        console.error('Error generating config:', error);
        return null;
    }
}

module.exports = { getWarpConfigLink6 };
