const express = require('express');
const { getWarpConfigLink } = require('./AWG');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Эндпоинт генерации конфига
app.post('/generate', async (req, res) => {
    try {
        const { domain, dns, allowedIPs } = req.body;
        // Если DNS не переданы, используем умолчания
        const dnsString = dns || "8.8.8.8, 2001:4860:4860::8888, 8.8.4.4, 2001:4860:4860::8844";
        const allowed = allowedIPs || "0.0.0.0/0, ::/0";
        
        const base64 = await getWarpConfigLink(domain, dnsString, allowed);
        if (base64) {
            res.json({ success: true, content: base64 });
        } else {
            res.status(500).json({ success: false, message: 'Не удалось сгенерировать конфиг' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = app;