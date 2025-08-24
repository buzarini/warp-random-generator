const fetch = require('node-fetch');
const nacl = require('tweetnacl');
const { Buffer } = require('buffer');
const wnacl = require('tweetnacl');
const { wBuffer } = require('buffer');

function generateKeys() {
    const keyPair = nacl.box.keyPair();
    return {
        privKey: Buffer.from(keyPair.secretKey).toString('base64'),
        pubKey: Buffer.from(keyPair.publicKey).toString('base64')
    };
}
 
function wgenerateKeys() {
    const wkeyPair = nacl.box.keyPair();
    return {
        wprivKey: Buffer.from(wkeyPair.secretKey).toString('base64'),
        wpubKey: Buffer.from(wkeyPair.publicKey).toString('base64')
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

    return {
        ip: `${range.prefix}${randomNumber}`,
        port: port
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

async function wapiRequest(method, endpoint, body = null, token = null) {
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

    const wresponse = await fetch(`https://api.cloudflareclient.com/v0i1909051800/${endpoint}`, options);
    return wresponse.json();
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

    const { wprivKey, wpubKey } = wgenerateKeys();
    // Регистрация устройства
    const wregBody = {
        install_id: "",
        tos: new Date().toISOString(),
        key: wpubKey,
        fcm_token: "",
        type: "ios",
        locale: "en_US"
    };
    const wregResponse = await wapiRequest('POST', 'reg', wregBody);
    const wid = wregResponse.result.id;
    const wtoken = wregResponse.result.token;
    // Включение WARP
    const wwarpResponse = await wapiRequest('PATCH', `reg/${wid}`, { warp_enabled: true }, wtoken);
    const wpeer_pub = wwarpResponse.result.config.peers[0].public_key;
    const wclient_ipv4 = wwarpResponse.result.config.interface.addresses.v4;
    const wclient_ipv6 = wwarpResponse.result.config.interface.addresses.v6;
    const wreserved64 = wwarpResponse.result.config.client_id;
    const wreservedHex = Buffer.from(wreserved64, 'base64').toString('hex');
    const wreservedDec = wreservedHex.match(/.{1,2}/g).map(hex => parseInt(hex, 16)).join(', ');
    const wreservedHex2 = '0x' + wreservedHex;

    // Генерация случайного endpoint
    const randomEndpoint = generateRandomEndpoint();
    const wrandomEndpoint = generateRandomEndpoint();

    // Формируем конфиг
    const conf = `# Ультимативный конфиг с кучей селекторов (Недоступные сайты, YouTube, Discord, Telegram, Cloudflare)
# Конфиг в первую очередь предназначен для использования внутри России.
# Может быть немного перегружен, а также содержать ошибки.
# Автор не является всезнающим экспертом, используйте конфиг только для тестирования и в качестве примера. Редактируйте под себя.
# Внимательно изучите все комментарии. В основном ориентируйтесь на основную документацию Mihomo —
# https://wiki.metacubex.one/ru/config/

# В шаблоне не используются мосты и цепочки прокси, только прямые подключения.
# В шаблоне не используются прокси-группы «Самый быстрый».
#
# В шаблоне используется прокси-группа «Любой доступный сервер». Внутри группы — хосты в случайном порядке.
# По умолчанию выбирается первый из списка, если он недоступен, выбирается второй и т.д.
# Для прокси-группы «RU сайты» используется только один прокси — «Без ВПН» (т.е. DIRECT).
#
# Списки доменов re:filter и itdog — для прокси-группы «Недоступные сайты». Подробнее смотрите в rules.

# Большое спасибо Legiz, PentiumB и itdog, чьи списки используются для правил.
# Также спасибо за пояснения и идеи для конфигов. Отдельное спасибо сообществу Remnawave и её разработчику.

mixed-port: 7890
allow-lan: true
lan-allowed-ips: # Разрешенные ip для подключения к lan
  - 0.0.0.0/8
  - 10.0.0.0/8
  - 100.64.0.0/10
  - 127.0.0.0/8
  - 169.254.0.0/16
  - 172.16.0.0/12
  - 192.0.0.0/24
  - 192.0.2.0/24
  - 192.88.99.0/24
  - 192.168.0.0/16
  - 198.18.0.0/15
  - 198.51.100.0/24
  - 203.0.113.0/24
  - 224.0.0.0/3
  - ::/127
  - fc00::/7
  - fe80::/10
  - ff00::/8
tcp-concurrent: true
enable-process: true
find-process-mode: always
mode: rule
log-level: info
ipv6: true # true - если используйте ipv6
bind-address: "*"
keep-alive-interval: 30
unified-delay: false

profile:
  store-selected: true
  store-fake-ip: true

sniffer:
  enable: true
  force-dns-mapping: true
  parse-pure-ip: true
  override-destination: false
  sniff:
    HTTP:
      ports:
        - 80
        - 8080-8880
      override-destination: true
    TLS:
      ports:
        - 443
        - 8443
    # Для VLESS REALITY не имеет смысла, так как всё равно делаем REJECT в rules. В противном случае, используем.
    QUIC:
      ports:
        - 443

  skip-dst-address: # Пропуск перехвата для целевых IP
    - 0.0.0.0/8
    - 10.0.0.0/8
    - 100.64.0.0/10
    - 127.0.0.0/8
    - 169.254.0.0/16
    - 172.16.0.0/12
    - 192.0.0.0/24
    - 192.0.2.0/24
    - 192.88.99.0/24
    - 192.168.0.0/16
    - 198.18.0.0/15
    - 198.51.100.0/24
    - 203.0.113.0/24
    - 224.0.0.0/3
    - ::/127
    - fc00::/7
    - fe80::/10
    - ff00::/8

tun:
  enable: true
  stack: gvisor
  auto-route: true
  auto-detect-interface: true
  dns-hijack:
    - any:53
    - tcp://any:53
  strict-route: true
  route-exclude-address:
    - 127.0.0.0/8
    - ::1/128

dns:
  enable: true
  prefer-h3: false
  use-hosts: true
  use-system-hosts: true
  ipv6: true #true - если хотите резолвить в ipv6
  enhanced-mode: redir-host
  # ----
  # Опционально выбираем DNS сервера. На ваш выбор с большим запасом, на случай недоступности
  default-nameserver:
    # DNS для доменов DNS серверов
    - tls://1.1.1.1
    - tls://1.0.0.1
  proxy-server-nameserver:
    # DNS для доменов прокси из раздела proxies
    - tls://1.1.1.1
    - tls://1.0.0.1
  direct-nameserver:
    # DNS для сайтов идущих через DIRECT
    - tls://1.1.1.1
    - tls://1.0.0.1
  nameserver:
    # Сервер по умолчанию, в данном случае используется для доменов, идущих через прокси
    - tls://1.1.1.1
    - tls://1.0.0.1

proxies:
  - name: "🇷🇺 Без VPN"
    type: direct
    udp: true

  - name: "WARP"
    type: wireguard
    private-key: ${privKey}
    server: ${randomEndpoint.ip}
    port: ${randomEndpoint.port}
    ip: ${client_ipv4}
    ipv6: ${client_ipv6}
    public-key: ${peer_pub}
    allowed-ips: ["0.0.0.0/0", "::/0"]
    reserved: [${reservedDec}]
    udp: true
    mtu: 1280
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
      i1: <b 0xc7000000010803cc5f2fb739316a000044d0b0e7052869be022bd0eb4227dd2a99d40b68e8ad64f89bd55bb3d60a151ffbf135ce5be51e3260897b2da5d5165244b5ba37681e8876c152fcc1a5b4ee6c05f986f650ac7562ec779c00a5fa1f8b52bc05de781a8bd1a23b7ee20c5c9930fb2bb8e784a8b472289ecf57fca3d829cde7c35c3de047a449c27ac62633c40e9b0816547826d0a7a67fdc6a09aae3d4c90adba4fff3fa6267bdce58782fbdbb5620e4bd585bf5041256a1ded444f0b49c6c32986e419f9318273b16965673fa115e5145db9169fd302a5c66237f908dc68a6f07aac420882774528a9de08a301434daae5846cf32bade22e919924c8bd663fcb35b8120757ea2ba6681475af84adb3134f85fe7fffaa446eeedf7e3ba58e66d227ef637c635ff20dbc62cd30354f975723148dcde1de4e66a5307ddc4762f24b13b0346fcb92f4dce84410edeb2350219998e7a46f62cb8ad9c957fef4de58d19c9acb6a0df0ec23854a5daf4deb4e05e05e3bd5b7097286ea16703a2abf675df614d87e15818f7e8df73a875de8a6cf6dcf19a770f1e2a767e8289054a93b81c3dcb078ef0ba5ee654546eedbf4ab593deeca962dd67293608130e0b4f61c40d1dc8a4f5119d15c8ff086f5d4bf6edd7c228ef0d8f095c4c79547bc20eb5c39e62cd4010e16e4e341857756a6e52ab11980c32aefbe7603c77e133ff9c2d1c85be5b11bc35b42a76b2bb421d6513858c904c0cefaa1b4c90ecf8bdbfa0ab2776b4eb6c503895deb0e312786bec0cccb7d2df8e8becec21be79dc1aed104b18d59446921617bef45e22d3846fd4e317158055cfc9b9a09569b0080e00b2dfef9771bcbe4290fbf1a020bd2da8bd0ebf804f192c6517b8b37f06f9e859d1ace554cae339263d173b53122bb977ee4f491c247835c045546b60e807d4ac09e779e8c27d9cc7381a5914d0c251224fc221b1650c89ed1443fb7b8cb42657154eb6b686ae7e25f2c0fa03486eda404fd5aeeb5eaffe43d5fa82780cb867ff915f7c65554107039b877d1335ea2f5f9db1bac8b2b0b0779c55e53ea942f72c0e459c05521860794e161f132a118895804d74b0103975e7f1d23681677f1bff0e2bbb39a219a5aa00dddfabdd914346ea51598a190649e872b94f47762fd4859e3071678307db79a1517aff4400ed67e7a4f008d4a7da31222845b465e185d3eb94086897545dd43f6f28dc7188c87e0daf8198d16f8411f8b1b2e35de9690cf8fe1ddffa94547cdbdefdb9414f3e46d8ff17d5b2c12421fa6395b33838ce90da4f39966fbf928187edd0f7b6b6fa7cd6c3acb179b8a38b56afbde4349d3d7887aeda5ab327e78a347030629a1632ac803596894786947536913273cde3da3751880fd22a1faf57e42887362692aa972968aa41b168372c14f64aeeaffe33bbc25dbeca7030091f150da50cd46bcbe5290a258703c161add7cf2f0b78be2f58224c24ae094ad1395be201c90285498d1a02754f588f11157354e792635882408b48c05c77b480a6355354408627cf6c05052a2023f6e46ded3a076f20781434a58605a5a614b4a3ce9662e87105b87fd0948e0e330ff58d14f46661e0ec89bb7c0c204399e1c9f227238a583dd9cbe91c522b3e832f1a9405b274a21a8c78570b67c922a25205c6a4dd6266b4b6e7331192a537c01f24ca139fd63922096a5c23729cdc5b899f8a9525bfdf5eae6cb7cfe8a90db80f41d75feb71a0dc7b572542a3>

  - name: "WARP in WARP"
    dialer-proxy: WARP
    type: wireguard
    private-key: ${wprivKey}
    server: ${wrandomEndpoint.ip}
    port: ${wrandomEndpoint.port}
    ip: ${wclient_ipv4}
    ipv6: ${wclient_ipv6}
    public-key: ${wpeer_pub}
    allowed-ips: ["0.0.0.0/0", "::/0"]
    reserved: [${wreservedDec}]
    udp: true
    mtu: 1280

proxy-groups:
  - name: 🚫 Недоступные сайты
    icon: https://raw.githubusercontent.com/remnawave/templates/refs/heads/main/icons/Blocked.png
    type: select
    proxies:
      - 🎲 Любой доступный сервер
      - 🇷🇺 Без VPN # Опционально

  - name: ▶️ YouTube
    icon: https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/YouTube.png
    type: select
    proxies:
      - 🚫 Недоступные сайты
      - 🇷🇺 Без VPN

  - name: 💬 Discord
    icon: https://raw.githubusercontent.com/remnawave/templates/refs/heads/main/icons/Discord.png
    type: select
    proxies:
      - 🚫 Недоступные сайты
      - 🇷🇺 Без VPN

  - name: ➤ Telegram
    icon: https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Telegram.png
    type: select
    proxies:
      - 🚫 Недоступные сайты
      - 🇷🇺 Без VPN

  - name: 🟠 Cloudflare
    icon: https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Cloudflare.png
    type: select
    proxies:
      - 🚫 Недоступные сайты
      - 🇷🇺 Без VPN

  - name: ⚪🔵🔴 RU сайты
    icon: https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Russia.png
    type: select
    remnawave: # Кастомное поле используемое только в Remnawave
      include-proxies: false # Опционально, если поставить true, прокси будут включены в эту группу
    proxies:
      - 🇷🇺 Без VPN

  - name: 🌍 Остальные сайты
    icon: https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Global.png
    type: select
    proxies:
      - 🇷🇺 Без VPN
      - 🚫 Недоступные сайты

  - name: PROXY
    remnawave: # Кастомное поле используемое только в Remnawave
      include-proxies: true
    type: select
    hidden: true
    proxies:
      - 🚫 Недоступные сайты

  - name: 🎲 Любой доступный сервер
    type: select
    proxies:
      - WARP
      - WARP in WARP
    remnawave: # Кастомное поле используемое только в Remnawave
      include-proxies: true
      shuffle-proxies-order: true
    url: "https://www.gstatic.com/generate_204"
    interval: 300
    hidden: false
    lazy: true

rule-providers:
  ru-inline-banned:
    type: inline
    payload:
      - DOMAIN-SUFFIX,habr.com
      - DOMAIN-SUFFIX,seasonvar.ru
      - DOMAIN-SUFFIX,lib.social
      - DOMAIN-SUFFIX,kemono.su
      - DOMAIN-SUFFIX,jut.su
      - DOMAIN-SUFFIX,kara.su
      - DOMAIN-SUFFIX,theins.ru
      - DOMAIN-SUFFIX,tvrain.ru
      - DOMAIN-SUFFIX,echo.msk.ru
      - DOMAIN-SUFFIX,the-village.ru
      - DOMAIN-SUFFIX,snob.ru
      - DOMAIN-SUFFIX,novayagazeta.ru
      - DOMAIN-SUFFIX,moscowtimes.ru
      - DOMAIN-SUFFIX,natribu.org
      - DOMAIN-KEYWORD,animego
      - DOMAIN-KEYWORD,yummyanime
      - DOMAIN-KEYWORD,yummy-anime
      - DOMAIN-KEYWORD,animeportal
      - DOMAIN-KEYWORD,anime-portal
      - DOMAIN-KEYWORD,animedub
      - DOMAIN-KEYWORD,anidub
      - DOMAIN-KEYWORD,animelib
      - DOMAIN-KEYWORD,ikianime
      - DOMAIN-KEYWORD,anilibria
    behavior: classical
  ru-inline:
    type: inline
    payload:
      - DOMAIN-SUFFIX,2ip.ru
      - DOMAIN-SUFFIX,yastatic.net
      - DOMAIN-SUFFIX,yandex.net
      - DOMAIN-SUFFIX,yandex.kz
      - DOMAIN-SUFFIX,yandex.com
      - DOMAIN-SUFFIX,yadi.sk
      - DOMAIN-SUFFIX,mycdn.me
      - DOMAIN-SUFFIX,jivosite.com
      - DOMAIN-SUFFIX,vk.com
      - DOMAIN-SUFFIX,avira.com
      - DOMAIN-SUFFIX,.ru
      - DOMAIN-SUFFIX,.su
      - DOMAIN-SUFFIX,.by
      - DOMAIN-SUFFIX,.ru.com
      - DOMAIN-SUFFIX,.ru.net
      - DOMAIN-SUFFIX,kudago.com
      - DOMAIN-SUFFIX,kinescope.io
      - DOMAIN-SUFFIX,redheadsound.studio
      - DOMAIN-SUFFIX,plplayer.online
      - DOMAIN-SUFFIX,lomont.site
      - DOMAIN-SUFFIX,remanga.org
      - DOMAIN-SUFFIX,shopstory.live
      - DOMAIN-KEYWORD,avito
      - DOMAIN-KEYWORD,miradres
      - DOMAIN-KEYWORD,premier
      - DOMAIN-KEYWORD,shutterstock
      - DOMAIN-KEYWORD,2gis
      - DOMAIN-KEYWORD,diginetica
      - DOMAIN-KEYWORD,kinescopecdn
      - DOMAIN-KEYWORD,researchgate
      - DOMAIN-KEYWORD,springer
      - DOMAIN-KEYWORD,nextcloud
      - DOMAIN-KEYWORD,kaspersky
      - DOMAIN-KEYWORD,stepik
      - DOMAIN-KEYWORD,likee
      - DOMAIN-KEYWORD,snapchat
      - DOMAIN-KEYWORD,yappy
      - DOMAIN-KEYWORD,pikabu
      - DOMAIN-KEYWORD,okko
      - DOMAIN-KEYWORD,wink
      - DOMAIN-KEYWORD,kion
      - DOMAIN-KEYWORD,roblox
      - DOMAIN-KEYWORD,ozon
      - DOMAIN-KEYWORD,wildberries
      - DOMAIN-KEYWORD,aliexpress
    behavior: classical
  geosite-ru:
    type: http
    behavior: domain
    format: mrs
    url: https://github.com/MetaCubeX/meta-rules-dat/raw/meta/geo/geosite/category-ru.mrs
    path: ./rule-sets/geosite-ru.mrs
    interval: 86400
  yandex:
    type: http
    behavior: domain
    format: yaml
    url: https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/yandex.yaml
    path: ./rule-sets/yandex.yaml
    interval: 86400
  ai:
    type: http
    behavior: domain
    format: mrs
    url: https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/category-ai-!cn.mrs
    path: ./rule-sets/ai.mrs
    interval: 86400
  mailru:
    type: http
    behavior: domain
    format: mrs
    url: https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/mailru.mrs
    path: ./rule-sets/mailru.mrs
  category-porn:
    type: http
    behavior: domain
    format: mrs
    url: https://github.com/MetaCubeX/meta-rules-dat/raw/meta/geo/geosite/category-porn.mrs
    path: ./rule-sets/category-porn.mrs
    interval: 86400
  drweb:
    type: http
    behavior: domain
    format: mrs
    url: https://github.com/MetaCubeX/meta-rules-dat/raw/meta/geo/geosite/drweb.mrs
    path: ./rule-sets/drweb.mrs
    interval: 86400
  geoip-ru:
    type: http
    behavior: ipcidr
    format: mrs
    url: https://github.com/MetaCubeX/meta-rules-dat/raw/meta/geo/geoip/ru.mrs
    path: ./rule-sets/geoip-ru.mrs
    interval: 86400
  geoip-by:
    type: http
    behavior: ipcidr
    format: mrs
    url: https://github.com/MetaCubeX/meta-rules-dat/raw/meta/geo/geoip/by.mrs
    path: ./rule-sets/geoip-by.mrs
    interval: 86400
  geosite-private:
    type: http
    behavior: domain
    format: mrs
    url: https://github.com/MetaCubeX/meta-rules-dat/raw/meta/geo/geosite/private.mrs
    path: ./rule-sets/geosite-private.mrs
    interval: 86400
  geoip-private:
    type: http
    behavior: ipcidr
    format: mrs
    url: https://github.com/MetaCubeX/meta-rules-dat/raw/meta/geo/geoip/private.mrs
    path: ./rule-sets/geoip-private.mrs
    interval: 86400
  discord_domains:
    type: http
    behavior: domain
    format: mrs
    url: https://github.com/MetaCubeX/meta-rules-dat/raw/meta/geo/geosite/discord.mrs
    path: ./rule-sets/discord_domains.mrs
    interval: 86400
  speedtest-net:
    type: http
    behavior: domain
    format: mrs
    url: https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/speedtest.mrs
    path: ./rule-sets/speedtest-net.mrs
    interval: 86400
  remote-control:
    type: http
    behavior: domain
    format: mrs
    url: https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/category-remote-control.mrs
    path: ./rule-sets/remote-control.mrs
    interval: 86400
  inline-blocked-ips:
    type: inline
    payload:
      - IP-CIDR,172.232.25.131/32 #IP для чата Warframe
    behavior: classical
  discord_voiceips:
    type: http
    behavior: ipcidr
    format: mrs
    url: https://github.com/legiz-ru/mihomo-rule-sets/raw/main/other/discord-voice-ip-list.mrs
    path: ./rule-sets/discord_voiceips.mrs
    interval: 86400
  discord_vc:
    type: inline
    payload:
      - AND,((IP-CIDR,138.128.136.0/21),(NETWORK,udp),(DST-PORT,50000-50100))
      - AND,((IP-CIDR,162.158.0.0/15),(NETWORK,udp),(DST-PORT,50000-50100))
      - AND,((IP-CIDR,172.64.0.0/13),(NETWORK,udp),(DST-PORT,50000-50100))
      - AND,((IP-CIDR,34.0.0.0/15),(NETWORK,udp),(DST-PORT,50000-50100))
      - AND,((IP-CIDR,34.2.0.0/15),(NETWORK,udp),(DST-PORT,50000-50100))
      - AND,((IP-CIDR,35.192.0.0/12),(NETWORK,udp),(DST-PORT,50000-50100))
      - AND,((IP-CIDR,35.208.0.0/12),(NETWORK,udp),(DST-PORT,50000-50100))
      - AND,((IP-CIDR,5.200.14.128/25),(NETWORK,udp),(DST-PORT,50000-50100))
      - AND,((IP-CIDR,66.22.192.0/18),(NETWORK,udp),(DST-PORT,50000-50100))
    behavior: classical
  refilter_domains:
    type: http
    behavior: domain
    format: mrs
    url: https://github.com/legiz-ru/mihomo-rule-sets/raw/main/re-filter/domain-rule.mrs
    path: ./rule-sets/refilter.mrs
    interval: 86400
  youtube:
    type: http
    behavior: domain
    format: mrs
    interval: 86400
    url: https://github.com/MetaCubeX/meta-rules-dat/raw/meta/geo/geosite/youtube.mrs
    path: ./rule-sets/youtube.mrs
  google-deepmind:
    type: http
    behavior: domain
    format: mrs
    interval: 86400
    url: https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/google-gemini.mrs
    path: ./rule-sets/gooogle-deepmind.mrs
  telegram-ips:
    type: http
    behavior: ipcidr
    format: mrs
    interval: 86400
    url: https://github.com/MetaCubeX/meta-rules-dat/raw/meta/geo/geoip/telegram.mrs
    path: ./rule-sets/telegram-ips.mrs
  telegram-domains:
    type: http
    behavior: domain
    format: mrs
    interval: 86400
    url: https://github.com/MetaCubeX/meta-rules-dat/raw/meta/geo/geosite/telegram.mrs
    path: ./rule-sets/telegram-domains.mrs
  oisd_big:
    type: http
    behavior: domain
    format: mrs
    url: https://github.com/legiz-ru/mihomo-rule-sets/raw/main/oisd/big.mrs
    path: ./rule-sets/oisd_big.mrs
    interval: 86400
  torrent-trackers:
    type: http
    behavior: domain
    format: mrs
    url: https://github.com/legiz-ru/mihomo-rule-sets/raw/main/other/torrent-trackers.mrs
    path: ./rule-sets/torrent-trackers.mrs
    interval: 86400
  torrent-clients:
    type: http
    behavior: classical
    format: yaml
    url: https://github.com/legiz-ru/mihomo-rule-sets/raw/main/other/torrent-clients.yaml
    path: ./rule-sets/torrent-clients.yaml
    interval: 86400
  ru-apps:
    type: http
    behavior: classical
    format: yaml
    url: https://github.com/legiz-ru/mihomo-rule-sets/blob/main/other/ru-app-list.yaml
    path: ./rule-sets/ru-apps.yaml
    interval: 86400
  ru-inside:
    type: http
    behavior: classical
    format: text
    url: https://raw.githubusercontent.com/itdoginfo/allow-domains/main/Russia/inside-clashx.lst
    path: ./rule-sets/ru-inside.lst
    interval: 86400
  ru-outside:
    type: http
    behavior: classical
    format: text
    url: https://raw.githubusercontent.com/itdoginfo/allow-domains/refs/heads/main/Russia/outside-clashx.lst
    path: ./rule-sets/ru-outside.lst
    interval: 86400
  cloudflare-ips:
    type: http
    behavior: ipcidr
    format: mrs
    url: https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geoip/cloudflare.mrs
    path: ./rule-sets/cloudflare-ips.mrs
    interval: 86400
  cloudflare-domains:
    type: http
    behavior: domain
    format: mrs
    url: https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/cloudflare.mrs
    path: ./rule-sets/cloudflare-domains.mrs
    interval: 86400
  cloudflare-PentiumB:
    type: http
    behavior: ipcidr
    format: text
    url: https://raw.githubusercontent.com/PentiumB/CDN-RuleSet/refs/heads/main/source/cloudflare.lst
    path: ./rule-sets/cloudflare-PentiumB.lst
    interval: 86400
  quic:
    type: inline
    behavior: classical
    payload:
      - AND,((NETWORK,udp),(DST-PORT,443))

rules:
  # Локальную сеть в директ
  - RULE-SET,geoip-private,DIRECT,no-resolve
  - RULE-SET,geosite-private,DIRECT

  # ВПН и всякие Anydesk, Rustdesk, Teamviewer в директ (опционально, можно убрать)
  - PROCESS-NAME-REGEX,(?i).*tailscale.*,DIRECT
  - PROCESS-NAME-REGEX,(?i).*wireguard.*,DIRECT
  - PROCESS-NAME-REGEX,(?i).*netbird.*,DIRECT
  - PROCESS-NAME-REGEX,(?i).*anydesk.*,DIRECT
  - PROCESS-NAME-REGEX,(?i).*rustdesk.*,DIRECT
  - PROCESS-NAME-REGEX,(?i).*teamviewer.*,DIRECT
  - RULE-SET,remote-control,DIRECT

  # Блокировка рекламы (опционально)
  - RULE-SET,oisd_big,REJECT # Списки скомпилированные Legiz
  # Пускаем эти домены твича в директ, чтобы избавиться от рекламы (опционально)
  - OR,((DOMAIN-SUFFIX,ads.twitch.tv),(DOMAIN-SUFFIX,playlist.ttvnw.net)),DIRECT
  # Отправляем торренты в DIRECT (опционально)
  - RULE-SET,torrent-clients,DIRECT
  - RULE-SET,torrent-trackers,DIRECT
  - PROCESS-NAME-REGEX,(?i).*torrent.*,DIRECT

  # Делаем REJECT QUIC (для VLESS REALITY)
  #- RULE-SET,quic,REJECT

  # Определялки IP пускаем в прокси, чтобы пользователь видел
  - OR,((DOMAIN,ipwho.is),(DOMAIN,api.ip.sb),(DOMAIN,ipapi.co),(DOMAIN,ipinfo.io),(DOMAIN-SUFFIX,2ip.io),(DOMAIN-SUFFIX,2ipcore.com)),🚫 Недоступные сайты

  # -----

  # ▶️ YouTube
  - RULE-SET,youtube,▶️ YouTube
  - PROCESS-NAME-REGEX,(?i).*youtube.*,▶️ YouTube

  # ➤ Telegram
  - RULE-SET,telegram-ips,➤ Telegram
  - RULE-SET,telegram-domains,➤ Telegram
  - PROCESS-NAME-REGEX,(?i).*ayugram.*,➤ Telegram
  - PROCESS-NAME-REGEX,(?i).*telegram.*,➤ Telegram

  # 💬 Discord
  - AND,((RULE-SET,cloudflare-ips),(NETWORK,udp),(DST-PORT,19200-19500)),💬 Discord
  - AND,((RULE-SET,cloudflare-PentiumB),(NETWORK,udp),(DST-PORT,19200-19500)),💬 Discord
  - AND,((RULE-SET,discord_voiceips),(NETWORK,udp),(DST-PORT,50000-50100)),💬 Discord
  - RULE-SET,discord_vc,💬 Discord
  - RULE-SET,discord_domains,💬 Discord
  - PROCESS-NAME-REGEX,(?i).*discord.*,💬 Discord

  # 🚫 Недоступные сайты
  - RULE-SET,ru-inside,🚫 Недоступные сайты # ITDog списки доменов недоступные из РФ - https://github.com/itdoginfo/allow-domains/blob/main/Russia/inside-raw.lst
  - RULE-SET,refilter_domains,🚫 Недоступные сайты # Re:Filter списки доменов недоступные из РФ - https://github.com/1andrevich/Re-filter-lists/blob/main/community.lst
  - RULE-SET,ru-inline-banned,🚫 Недоступные сайты # Домены набитые вручную (смотрите выше)
  - RULE-SET,inline-blocked-ips,🚫 Недоступные сайты # IP набитые вручную (смотрите выше)
  - RULE-SET,category-porn,🚫 Недоступные сайты # Опционально
  - RULE-SET,ai,🚫 Недоступные сайты # Нейросети
  - RULE-SET,google-deepmind,🚫 Недоступные сайты # Google Gemini и AI Studio
  - RULE-SET,speedtest-net,🚫 Недоступные сайты # speedtest.net

  # 🟠 Cloudflare
  - RULE-SET,cloudflare-ips,🟠 Cloudflare # Список ip MetaCubeX
  - RULE-SET,cloudflare-domains,🟠 Cloudflare # Домены сервисов Cloudflare
  - RULE-SET,cloudflare-PentiumB,🟠 Cloudflare # Список ip от PentiumB

  # ⚪🔵🔴 RU сайты
  - RULE-SET,ru-inline,⚪🔵🔴 RU сайты # Списки набитые вручную (смотрите выше)
  - RULE-SET,ru-outside,⚪🔵🔴 RU сайты # ITDog списки доменов доступные только внутри РФ - https://github.com/itdoginfo/allow-domains/blob/main/Russia/outside-raw.lst
  - RULE-SET,ru-apps,⚪🔵🔴 RU сайты # Списки РУ приложений от Legiz
  - RULE-SET,yandex,⚪🔵🔴 RU сайты # Яндекс
  - RULE-SET,mailru,⚪🔵🔴 RU сайты # mail.ru
  - RULE-SET,drweb,⚪🔵🔴 RU сайты # DrWeb
  - RULE-SET,geosite-ru,⚪🔵🔴 RU сайты
  - RULE-SET,geoip-ru,⚪🔵🔴 RU сайты
  - RULE-SET,geoip-by,⚪🔵🔴 RU сайты # Опционально

  # 🌍 Остальные сайты
  - MATCH,🌍 Остальные сайты`;

    // Возвращаем конфиг
    return conf;
}

// Основная функция для генерации ссылки на скачивание конфига
async function getWarpConfigLink3() {
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
module.exports = { getWarpConfigLink3 };
