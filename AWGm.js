const fetch = require('node-fetch');
const nacl = require('tweetnacl');
const { Buffer } = require('buffer');

async function generateWarpConfig(dns = "1.1.1.1, 1.0.0.1, 2606:4700:4700::1111, 2606:4700:4700::1001", allowedIPs = "0.0.0.0/0, ::/0") {
    try {
        console.log('Generating keys...');
        const keyPair = nacl.box.keyPair();
        const privKey = Buffer.from(keyPair.secretKey).toString('base64');
        const pubKey = Buffer.from(keyPair.publicKey).toString('base64');

        console.log('Registering device...');
        const regResponse = await fetch('https://api.cloudflareclient.com/v0a2222/reg', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0',
            },
            body: JSON.stringify({
                install_id: "",
                tos: new Date().toISOString(),
                key: pubKey,
                fcm_token: "",
                type: "Android",
                locale: "en_US"
            })
        });

        if (!regResponse.ok) {
            const error = await regResponse.text();
            throw new Error(`Registration failed: ${regResponse.status} - ${error}`);
        }

        const regData = await regResponse.json();
        console.log('Registration successful:', regData);

        const token = regData.token;
        const id = regData.id;

        console.log('Enabling WARP...');
        const warpResponse = await fetch(`https://api.cloudflareclient.com/v0a2222/reg/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ warp_enabled: true })
        });

        if (!warpResponse.ok) {
            const error = await warpResponse.text();
            throw new Error(`WARP enable failed: ${warpResponse.status} - ${error}`);
        }

        const warpData = await warpResponse.json();
        console.log('WARP enabled:', warpData);

        if (!warpData.config || !warpData.config.peers || !warpData.config.interface) {
            throw new Error('Invalid WARP configuration received');
        }

        const config = `[Interface]
PrivateKey = ${privKey}
Address = ${warpData.config.interface.addresses.v4}, ${warpData.config.interface.addresses.v6}
DNS = ${dns}

[Peer]
PublicKey = ${warpData.config.peers[0].public_key}
AllowedIPs = ${allowedIPs}
Endpoint = ${warpData.config.peers[0].endpoint.host}:2408`;

        return config;
    } catch (error) {
        console.error('Error in generateWarpConfig:', error);
        throw error;
    }
}

module.exports = { generateWarpConfig };
