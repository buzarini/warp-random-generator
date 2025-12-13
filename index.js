const express = require('express');
const { getWarpConfigLink1 } = require('./AWG');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Константы
const DEFAULT_DNS = "1.1.1.1, 1.0.0.1, 2606:4700:4700::1111, 2606:4700:4700::1001";
const DEFAULT_ALLOWED_IPS = "0.0.0.0/0, ::/0";

// Обработчики маршрутов
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/warp1w', async (req, res) => {
    try {
        const { dns = DEFAULT_DNS, allowedIPs = DEFAULT_ALLOWED_IPS } = req.query;
        
        const content = await getWarpConfigLink1(dns, allowedIPs);
        
        if (!content) {
            return res.status(500).json({ 
                success: false, 
                message: 'Не удалось сгенерировать конфигурацию' 
            });
        }
        
        res.json({ success: true, content });
        
    } catch (error) {
        console.error('Request processing error:', error);
        
        res.status(500).json({ 
            success: false, 
            message: 'Внутренняя ошибка сервера' 
        });
    }
});

// Обработчик 404
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Ресурс не найден' 
    });
});

// Экспорт для тестирования и запуска
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;