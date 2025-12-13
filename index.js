const express = require('express');
const { getWarpConfigLink1 } = require('./AWG');
const { getWarpConfigLink5 } = require('./Clash');
const path = require('path');

const app = express();

// Подключаем статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Маршрут для генерации конфига
app.get('/warp1w', async (req, res) => {
    try {
        const dns = req.query.dns || "1.1.1.1, 1.0.0.1, 2606:4700:4700::1111, 2606:4700:4700::1001";
        const allowedIPs = req.query.allowedIPs || "0.0.0.0/0, ::/0";
        const content = await getWarpConfigLink1(dns, allowedIPs);
        if (content) {
            res.json({ success: true, content });
        } else {
            res.status(500).json({ success: false, message: 'Не удалось сгенерировать конфиг.' });
        }
    } catch (error) {
        console.error('Ошибка при обработке запроса:', error);
        res.status(500).json({ success: false, message: 'Произошла ошибка на сервере.' });
    }
});

app.get('/warp5', async (req, res) => {
    try {
        const content = await getWarpConfigLink5();
        if (content) {
            res.json({ success: true, content });
        } else {
            res.status(500).json({ success: false, message: 'Не удалось сгенерировать конфиг.' });
        }
    } catch (error) {
        console.error('Ошибка при обработке запроса:', error);
        res.status(500).json({ success: false, message: 'Произошла ошибка на сервере.' });
    }
});

module.exports = app;
