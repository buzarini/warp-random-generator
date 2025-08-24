const express = require('express');
const { getWarpConfigLink } = require('./AWGr192');
const { getWarpConfigLink2 } = require('./AWGr195');
const { getWarpConfigLink3 } = require('./CLASHr192');
const { getWarpConfigLink4 } = require('./CLASHr195');
const path = require('path');

const app = express();

// Подключаем статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Маршрут для генерации конфига
app.get('/warp', async (req, res) => {
    try {
        const dns = req.query.dns || "1.1.1.1, 1.0.0.1, 2606:4700:4700::1111, 2606:4700:4700::1001"; 
        const allowedIPs = req.query.allowedIPs || "0.0.0.0/0, ::/0"; 
        const content = await getWarpConfigLink(dns, allowedIPs);
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

app.get('/warp2', async (req, res) => {
    try {
        const dns = req.query.dns || "1.1.1.1, 1.0.0.1, 2606:4700:4700::1111, 2606:4700:4700::1001"; 
        const allowedIPs = req.query.allowedIPs || "0.0.0.0/0, ::/0"; 
        const content = await getWarpConfigLink2(dns, allowedIPs);
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

app.get('/warp3', async (req, res) => {
    try {
        const content = await getWarpConfigLink3();
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

app.get('/warp4', async (req, res) => {
    try {
        const content = await getWarpConfigLink4();
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
