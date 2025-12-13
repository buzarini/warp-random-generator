const fetch = require('node-fetch');
const nacl = require('tweetnacl');
const { Buffer } = require('buffer');

function generateRandomEndpoint() {
    const prefixes = ["162.159.192.", "162.159.195.", "engage.cloudflareclient.com"];
    const ports = [4500, 2408, 1701, 500];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const port = ports[Math.floor(Math.random() * ports.length)];

    if (prefix === "engage.cloudflareclient.com") {
        return `${prefix}:${port}`;
    } else if (prefix === "162.159.192.") {
        // Диапазон 1-20 для 162.159.192.
        const randomNumber = Math.floor(Math.random() * 20) + 1;
        return `${prefix}${randomNumber}:${port}`;
    } else {
        // Диапазон 1-10 для 162.159.195.
        const randomNumber = Math.floor(Math.random() * 10) + 1;
        return `${prefix}${randomNumber}:${port}`;
    }
}

// Новая функция для парсинга endpoint
function parseRandomEndpoint(endpoint) {
    const [host, port] = endpoint.split(':');
    return { host, port };
}

function generateKeys() {
    const keyPair = nacl.box.keyPair();
    return {
        privKey: Buffer.from(keyPair.secretKey).toString('base64'),
        pubKey: Buffer.from(keyPair.publicKey).toString('base64')
    };
}
 
// Функция для отправки запросов к API Cloudflare
async function apiRequest(method, endpoint, body = null, wtoken = null) {
    const headers = {
        'User-Agent': '',
        'Content-Type': 'application/json',
    };

    if (wtoken) {
        headers['Authorization'] = `Bearer ${wtoken}`;
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

    // Регистрация устройства
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

    // Включение WARP
    const warpResponse = await apiRequest('PATCH', `reg/${id}`, { warp_enabled: true }, token);

    const peer_pub = warpResponse.result.config.peers[0].public_key;
    const client_ipv4 = warpResponse.result.config.interface.addresses.v4;
    const client_ipv6 = warpResponse.result.config.interface.addresses.v6;

    const reserved64 = warpResponse.result.config.client_id;
    const reservedHex = Buffer.from(reserved64, 'base64').toString('hex');
    const reservedDec = reservedHex.match(/.{1,2}/g).map(hex => parseInt(hex, 16)).join(', ');
    const reservedHex2 = '0x' + reservedHex;

    // Генерируем случайный endpoint и парсим его
    const randomEndpoint = generateRandomEndpoint();
    const { host: randomServer, port: randomPort } = parseRandomEndpoint(randomEndpoint);

    // Формируем конфиг с рандомными server и port
    const conf = `warp-common: &warp-common
  type: wireguard
  private-key: ${privKey}
  server: ${randomServer}
  port: ${randomPort}
  ip: ${client_ipv4}
  ipv6: ${client_ipv6}
  public-key: ${peer_pub}
  allowed-ips: ['0.0.0.0/0']
  reserved: [${reservedDec}]
  udp: true
  mtu: 1280
  remote-dns-resolve: true
  dns: [1.1.1.1, 1.0.0.1, 2606:4700:4700::1111, 2606:4700:4700::1001]
   
proxies:
- name: "WARP"
  <<: *warp-common
  amnezia-wg-option:
   jc: 4
   jmin: 40
   jmax: 70
   s1: 0
   s2: 0
   h1: 1
   h2: 2
   h4: 3
   h3: 4  
   i1: <b 0x1>
   i2: <b 0x2>

proxy-groups:
- name: WARP
  type: select
  icon: https://www.vectorlogo.zone/logos/cloudflare/cloudflare-icon.svg
  proxies:
    - "WARP"
  url: 'http://speed.cloudflare.com/'
  interval: 300`;

    // Возвращаем конфиг
    return conf;
}

// Основная функция для генерации ссылки на скачивание конфига
async function getWarpConfigLink5() {
    try {
        const conf = await generateWarpConfig();
        const confBase64 = Buffer.from(conf).toString('base64');
        return `${confBase64}`;
    } catch (error) {
        console.error('Ошибка при генерации конфига:', error);
        return null;
    }
}

// Экспортируем функцию для использования
module.exports = { getWarpConfigLink5 };