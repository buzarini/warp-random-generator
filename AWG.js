const fetch = require('node-fetch');
const nacl = require('tweetnacl');
const { Buffer } = require('buffer');
const { generateI1 } = require('./quic');

// Порты и адреса для Endpoint
const ports = [500, 854, 859, 864, 878, 880, 890, 891, 894, 903, 908, 928, 934, 939, 942, 943, 945, 946, 955, 968, 987, 988, 1002, 1010, 1014, 1018, 1070, 1074, 1180, 1387, 1701, 1843, 2371, 2408, 2506, 3138, 3476, 3581, 3854, 4177, 4198, 4233, 4500, 5279, 5956, 7103, 7152, 7156, 7281, 7559, 8319, 8742, 8854, 8886];
const ipRanges = [
  { start: 1, end: 20, prefix: "162.159.192." },
  { start: 1, end: 10, prefix: "162.159.195." }
];
const domainEndpoint = "engage.cloudflareclient.com";

function getRandomEndpoint() {
  const useDomain = Math.random() < 0.33; // 1/3 chance to use domain
  if (useDomain) {
    const port = ports[Math.floor(Math.random() * ports.length)];
    return `${domainEndpoint}:${port}`;
  } else {
    const range = ipRanges[Math.floor(Math.random() * ipRanges.length)];
    const ipNum = Math.floor(Math.random() * (range.end - range.start + 1)) + range.start;
    const ip = range.prefix + ipNum;
    const port = ports[Math.floor(Math.random() * ports.length)];
    return `${ip}:${port}`;
  }
}

function generateKeys() {
  const keyPair = nacl.box.keyPair();
  return {
    privateKey: Buffer.from(keyPair.secretKey).toString('base64'),
    publicKey: Buffer.from(keyPair.publicKey).toString('base64')
  };
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

async function getWarpConfig(domain, level, dns, allowedIPs) {
  const { privateKey, publicKey } = generateKeys();

  // Регистрация
  const regBody = {
    install_id: "",
    tos: new Date().toISOString(),
    key: publicKey,
    fcm_token: "",
    type: "ios",
    locale: "en_US"
  };
  const regResponse = await apiRequest('POST', 'reg', regBody);
  if (!regResponse.result || !regResponse.result.id) {
    throw new Error('Registration failed');
  }
  const id = regResponse.result.id;
  const token = regResponse.result.token;

  // Включение WARP
  const warpResponse = await apiRequest('PATCH', `reg/${id}`, { warp_enabled: true }, token);
  if (!warpResponse.result || !warpResponse.result.config) {
    throw new Error('Failed to enable WARP');
  }

  const peerPub = warpResponse.result.config.peers[0].public_key;
  const clientIpv4 = warpResponse.result.config.interface.addresses.v4;
  const clientIpv6 = warpResponse.result.config.interface.addresses.v6;
  const endpoint = getRandomEndpoint();

  // Генерируем I1 через quic.js
  const i1 = await generateI1(domain, level);

  const conf = `[Interface]
PrivateKey = ${privateKey}
Jc = 4
Jmin = 40
Jmax = 70
H1 = 1
H2 = 2
H3 = 3
H4 = 4
I1 = ${i1}
Address = ${clientIpv4}, ${clientIpv6}
DNS = ${dns}
MTU = 1280

[Peer]
PublicKey = ${peerPub}
AllowedIPs = ${allowedIPs}
Endpoint = ${endpoint}`;

  return Buffer.from(conf).toString('base64');
}

module.exports = { getWarpConfig };