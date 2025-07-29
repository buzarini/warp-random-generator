const express = require('express');
const { getWarpConfigLink } = require('./AWGp');
const { getWarpConfigLink2 } = require('./Karing');
const { getWarpConfigLink3 } = require('./WarpInWarp');
const { getWarpConfigLink4 } = require('./AWGr');
const { getWarpConfigLink5 } = require('./Neko');
const { getWarpConfigLink6 } = require('./AWGm');
const { getWarpConfigLink7 } = require('./Clash');
const { getWarpConfigLink8 } = require('./Husi');
const path = require('path');

const app = express();

// Подключаем статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Маршрут для генерации конфига
app.post('/warp', async (req, res) => {
    try {
        const { dns, allowedIPs } = req.body;
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
        const content = await getWarpConfigLink2();
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

app.post('/warp4', async (req, res) => {
    try {
        const { dns, allowedIPs } = req.body;
        const content = await getWarpConfigLink4(dns, allowedIPs);
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

app.post('/warp6', async (req, res) => {
    try {
        console.log('Received request with body:', req.body);
        const { dns, allowedIPs } = req.body;
        
        if (!dns || !allowedIPs) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required parameters: dns and allowedIPs' 
            });
        }

        const config = await generateWarpConfig(dns, allowedIPs);
        const content = Buffer.from(config).toString('base64');
        
        res.json({ 
            success: true, 
            content 
        });
    } catch (error) {
        console.error('Error in /warp6:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate config',
            error: error.message 
        });
    }
});

app.get('/warp7', async (req, res) => {
    try {
        const content = await getWarpConfigLink7();
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

app.get('/warp8', async (req, res) => {
    try {
        const content = await getWarpConfigLink8();
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
