/**
 * Модуль генератора конфигураций WireGuard для Cloudflare WARP+
 */
const fetch = require('node-fetch');
const nacl = require('tweetnacl');
const { Buffer } = require('buffer');

/** Конфигурационные параметры */
const CONFIG = {
    PORTS: [
        500, 854, 859, 864, 878, 880, 890, 891, 894, 903, 908, 928, 934, 939,
        942, 943, 945, 946, 955, 968, 987, 988, 1002, 1010, 1014, 1018, 1070,
        1074, 1180, 1387, 1701, 1843, 2371, 2408, 2506, 3138, 3476, 3581, 3854,
        4177, 4198, 4233, 4500, 5279, 5956, 7103, 7152, 7156, 7281, 7559, 8319,
        8742, 8854, 8886
    ],
    API_SETTINGS: {
        BASE_URL: 'https://api.cloudflareclient.com/v0i1909051800',
        DEFAULT_HEADERS: {
            'Content-Type': 'application/json'
        }
    },
    WG_CONFIG: {
        S_VALUES: [0, 0],
        H_VALUES: [1, 2, 3, 4],
        MTU: 1280,
        DNS: [
            '1.1.1.1', '2606:4700:4700::1111',
            '1.0.0.1', '2606:4700:4700::1001'
        ]
    }
};

/** Криптографические утилиты */
const crypto = {
    /** Генерирует пару ключей WireGuard */
    generateKeyPair: () => {
        const { publicKey, secretKey } = nacl.box.keyPair();
        return {
            privateKey: Buffer.from(secretKey).toString('base64'),
            publicKey: Buffer.from(publicKey).toString('base64')
        };
    }
};

/** Сетевые утилиты */
const network = {
    /** Генерирует случайный endpoint */
    randomEndpoint: (prefix) =>
        `${prefix}${Math.floor(Math.random() * 256)}:${
      CONFIG.PORTS[Math.floor(Math.random() * CONFIG.PORTS.length)]
    }`
};

/** API клиент */
const api = {
    /** Выполняет запрос к API Cloudflare */
    request: async (method, endpoint, { body = null, token = null } = {}) => {
        const response = await fetch(
            `${CONFIG.API_SETTINGS.BASE_URL}/${endpoint}`, {
                method,
                headers: {
                    ...CONFIG.API_SETTINGS.DEFAULT_HEADERS,
                    ...(token && { Authorization: `Bearer ${token}` })
                },
                body: body && JSON.stringify(body)
            }
        );

        if (!response.ok) throw new Error(`API request failed: ${response.status}`);
        return response.json();
    }
};

/** Генератор конфигурации */
const generateConfig = async (ipPrefix, jc, jmin, jmax) => {
    const { privateKey, publicKey } = crypto.generateKeyPair();

    // Регистрация устройства
    const { result: registration } = await api.request('POST', 'reg', {
        body: {
            install_id: "",
            tos: new Date().toISOString(),
            key: publicKey,
            fcm_token: "",
            type: "ios",
            locale: "en_US"
        }
    });

    if (!registration?.id || !registration?.token) {
        throw new Error('Device registration failed');
    }

    // Активация WARP+
    await api.request('PATCH', `reg/${registration.id}`, {
        body: { warp_enabled: true },
        token: registration.token
    });

    // Получение конфигурации
    const { result: { config: { peers, interface: iface } } } = await api.request(
        'GET', `reg/${registration.id}`, { token: registration.token }
    );

    // Формирование конфига
    return [
        '[Interface]',
        `PrivateKey = ${privateKey}`,
        `S1 = ${CONFIG.WG_CONFIG.S_VALUES[0]}`,
        `S2 = ${CONFIG.WG_CONFIG.S_VALUES[1]}`,
        `Jc = ${jc}`,
        `Jmin = ${jmin}`,
        `Jmax = ${jmax}`,
        ...CONFIG.WG_CONFIG.H_VALUES.map((h, i) => `H${i+1} = ${h}`),
        `MTU = ${CONFIG.WG_CONFIG.MTU}`,
        `Address = ${iface.addresses.v4}, ${iface.addresses.v6}`,
        `DNS = ${CONFIG.WG_CONFIG.DNS.join(', ')}`,
        '',
        '[Peer]',
        `PublicKey = ${peers[0].public_key}`,
        'AllowedIPs = 0.0.0.0/0, ::/0',
        `Endpoint = ${network.randomEndpoint(ipPrefix)}`
    ].join('\n');
};

/** Получает конфигурацию в base64 */
const getConfig = async (ipPrefix, jc, jmin, jmax) => {
    try {
        const config = await generateConfig(ipPrefix, jc, jmin, jmax);
        return Buffer.from(config).toString('base64');
    } catch (error) {
        console.error('Configuration error:', error.message);
        return null;
    }
};

module.exports = {
    getWarpConfigLink: () => getConfig("188.114.96.", 4, 40, 70),
    getWarpConfigLink2: () => getConfig("188.114.97.", 4, 40, 70),
    getWarpConfigLink3: () => getConfig("188.114.98.", 4, 40, 70),
    getWarpConfigLink4: () => getConfig("188.114.99.", 4, 40, 70),
    getWarpConfigLink5: () => getConfig("162.159.192.", 4, 40, 70),
    getWarpConfigLink6: () => getConfig("162.159.195.", 4, 40, 70),
    getWarpConfigLink7: () => getConfig("188.114.96.", 120, 23, 911),
    getWarpConfigLink8: () => getConfig("188.114.97.", 120, 23, 911),
    getWarpConfigLink9: () => getConfig("188.114.98.", 120, 23, 911),
    getWarpConfigLink10: () => getConfig("188.114.99.", 120, 23, 911),
    getWarpConfigLink11: () => getConfig("162.159.192.", 120, 23, 911),
    getWarpConfigLink12: () => getConfig("162.159.195.", 120, 23, 911)
};
