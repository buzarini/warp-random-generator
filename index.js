const express = require('express');
const { getWarpConfigLink1 } = require('./AWG');
const path = require('path');

const app = express();

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/warp1w', async (req, res) => {
    const DEFAULT_DNS = "8.8.8.8, 8.8.4.4, 2001:4860:4860::8888, 2001:4860:4860::8844";
    const DEFAULT_ALLOWED_IPS = "0.0.0.0/0, ::/0";
    
    try {
        const { dns = DEFAULT_DNS, allowedIPs = DEFAULT_ALLOWED_IPS, domain = 'www.google.com' } = req.query;
        const content = await getWarpConfigLink1(dns, allowedIPs, domain);
        
        if (content) {
            return res.json({ success: true, content });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Не удалось сгенерировать конфиг.' 
        });
    } catch (error) {
        console.error('Ошибка при обработке запроса:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Произошла ошибка на сервере.' 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
