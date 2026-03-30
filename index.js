const express = require('express');
const { getWarpConfig } = require('./AWG');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Проверка существования домена через DNS-over-HTTPS (Google)
async function validateDomain(domain) {
  try {
    const urlA = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`;
    const urlAAAA = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=AAAA`;
    const [resA, resAAAA] = await Promise.all([
      fetch(urlA).then(r => r.json()),
      fetch(urlAAAA).then(r => r.json())
    ]);
    const hasA = resA.Answer && resA.Answer.length > 0;
    const hasAAAA = resAAAA.Answer && resAAAA.Answer.length > 0;
    return hasA || hasAAAA;
  } catch (err) {
    return false;
  }
}

// Маршрут генерации
app.post('/generate', async (req, res) => {
  let { domain, level } = req.body;
  const dns = "8.8.8.8, 8.8.4.4, 2001:4860:4860::8888, 2001:4860:4860::8844";
  const allowedIPs = "0.0.0.0/0, ::/0";

  // Если домен не передан, используем www.google.com
  if (!domain || domain.trim() === '') {
    domain = 'www.google.com';
  }

  // Проверяем существование домена, если нет — подставляем www.google.com
  const exists = await validateDomain(domain);
  if (!exists) {
    domain = 'www.google.com';
  }

  try {
    const contentBase64 = await getWarpConfig(domain, level, dns, allowedIPs);
    if (contentBase64) {
      const random = Math.floor(Math.random() * (99 - 10 + 1) + 10);
      const fileName = `WARP_${random}.conf`;
      res.json({ success: true, content: contentBase64, fileName });
    } else {
      res.status(500).json({ success: false, message: 'Не удалось сгенерировать конфиг.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Ошибка сервера при генерации.' });
  }
});

module.exports = app;