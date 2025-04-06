const express = require('express');
const path = require('path');
const {
    getWarpConfigLink,
    getWarpConfigLink2,
    getWarpConfigLink3,
    getWarpConfigLink4,
    getWarpConfigLink5,
    getWarpConfigLink6,
    getWarpConfigLink7,
    getWarpConfigLink8,
    getWarpConfigLink9,
    getWarpConfigLink10,
    getWarpConfigLink11,
    getWarpConfigLink12
} = require('./AWGR');

const app = express();

/** Middleware для статических файлов */
app.use(express.static(path.join(__dirname, 'public')));

/** Обработчик главной страницы */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/** Фабрика обработчиков для warp-маршрутов */
const createWarpHandler = (generator) => async (req, res) => {
    try {
        const content = await generator();
        content
            ? res.json({ success: true, content })
            : res.status(500).json({ success: false, message: 'Ошибка генерации конфига' });
    } catch (error) {
        console.error('Ошибка запроса:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
};

/** Маршруты */
const routes = [
    { path: '/warp', handler: getWarpConfigLink },
    { path: '/warp2', handler: getWarpConfigLink2 },
    { path: '/warp3', handler: getWarpConfigLink3 },
    { path: '/warp4', handler: getWarpConfigLink4 },
    { path: '/warp5', handler: getWarpConfigLink5 },
    { path: '/warp6', handler: getWarpConfigLink6 },
    { path: '/warp7', handler: getWarpConfigLink7 },
    { path: '/warp8', handler: getWarpConfigLink8 },
    { path: '/warp9', handler: getWarpConfigLink9 },
    { path: '/warp10', handler: getWarpConfigLink10 },
    { path: '/warp11', handler: getWarpConfigLink11 },
    { path: '/warp12', handler: getWarpConfigLink12 }
];

/** Регистрация маршрутов */
routes.forEach(route => {
    app.get(route.path, createWarpHandler(route.handler));
});

module.exports = app;
