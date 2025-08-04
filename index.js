const express = require('express');
const path = require('path');
const {
    getWarpConfigLink,
    getWarpConfigLink2,
    getWarpConfigLink3
} = require('./AWGr');
const {
    getWarpConfigLink4,
    getWarpConfigLink5,
    getWarpConfigLink6
} = require('./Throne');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Общий обработчик для маршрутов Warp
async function handleWarpRequest(req, res, configGenerator) {
    try {
        const dns = req.query.dns || "1.1.1.1, 1.0.0.1, 2606:4700:4700::1111, 2606:4700:4700::1001";
        const allowedIPs = req.query.allowedIPs || "0.0.0.0/0, ::/0";
        
        const content = await configGenerator(dns, allowedIPs);
        if (!content) throw new Error('Не удалось сгенерировать конфиг');
        
        res.json({ success: true, content });
    } catch (error) {
        console.error('Ошибка при обработке запроса:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Произошла ошибка на сервере'
        });
    }
}

// Обработчики для Throne (без параметров)
async function handleThroneRequest(req, res, configGenerator) {
    try {
        const content = await configGenerator();
        if (!content) throw new Error('Не удалось сгенерировать конфиг');
        
        res.json({ success: true, content });
    } catch (error) {
        console.error('Ошибка при обработке запроса:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Произошла ошибка на сервере'
        });
    }
}

// Маршруты
app.get('/warp', (req, res) => handleWarpRequest(req, res, getWarpConfigLink));
app.get('/warp2', (req, res) => handleWarpRequest(req, res, getWarpConfigLink2));
app.get('/warp3', (req, res) => handleWarpRequest(req, res, getWarpConfigLink3));
app.get('/warp4', (req, res) => handleThroneRequest(req, res, getWarpConfigLink4));
app.get('/warp5', (req, res) => handleThroneRequest(req, res, getWarpConfigLink5));
app.get('/warp6', (req, res) => handleThroneRequest(req, res, getWarpConfigLink6));

module.exports = app;
