/** Конфигурация приложения */
const AppConfig = (() => {
    const BUTTONS = Object.freeze([
        { id: 'generateButton', endpoint: 'warp', prefix: 'WARPrm96', defaultText: '188.114.96.*' },
        { id: 'generateButton2', endpoint: 'warp2', prefix: 'WARPrm97', defaultText: '188.114.97.*' },
        { id: 'generateButton3', endpoint: 'warp3', prefix: 'WARPrm98', defaultText: '188.114.98.*' },
        { id: 'generateButton4', endpoint: 'warp4', prefix: 'WARPrm99', defaultText: '188.114.99.*' },
        { id: 'generateButton5', endpoint: 'warp5', prefix: 'WARPrm162', defaultText: '162.159.192.*' },
        { id: 'generateButton6', endpoint: 'warp6', prefix: 'WARPrm165', defaultText: '162.159.195.*' },
        { id: 'generateButton7', endpoint: 'warp7', prefix: 'WARPrp96', defaultText: '188.114.96.*' },
        { id: 'generateButton8', endpoint: 'warp8', prefix: 'WARPrp97', defaultText: '188.114.97.*' },
        { id: 'generateButton9', endpoint: 'warp9', prefix: 'WARPrp98', defaultText: '188.114.98.*' },
        { id: 'generateButton10', endpoint: 'warp10', prefix: 'WARPrp99', defaultText: '188.114.99.*' },
        { id: 'generateButton11', endpoint: 'warp11', prefix: 'WARPrp162', defaultText: '162.159.192.*' },
        { id: 'generateButton12', endpoint: 'warp12', prefix: 'WARPrp165', defaultText: '162.159.195.*' },
    ]);

    const CONSTANTS = Object.freeze({
        ID_RANGE: { MIN: 10, MAX: 99 },
        MAX_CONCURRENT_DOWNLOADS: 5,
        CLEANUP_DELAY_MS: 100,
        STATUS: {
            GENERATING: 'Создаём конфигурацию...',
            SUCCESS: 'Конфигурация завершена.',
            ERROR: 'Ошибка при создании конфигурации.'
        }
    });

    const URLS = Object.freeze({
        API_BASE: '/',
        DOCUMENTATION: 'https://docs.google.com/document/d/1DX4X7t7V4QasQJYbps5D1yNtsK7tqsouSMJH2w4AMOY'
    });

    return Object.freeze({ BUTTONS, CONSTANTS, URLS });
})();

/** Генератор ID */
const IdGenerator = (() => {
    /** Генерирует случайный ID */
    const generate = () => {
        const { MIN, MAX } = AppConfig.CONSTANTS.ID_RANGE;
        const buffer = new Uint32Array(1);
        crypto.getRandomValues(buffer);
        return MIN + (buffer[0] % (MAX - MIN + 1));
    };

    return Object.freeze({ generate });
})();

/** DOM сервис */
const DOMService = (() => {
    /** Создает элемент */
    const createElement = (tag, attrs = {}) => {
        const el = document.createElement(tag);
        Object.entries(attrs).forEach(([key, val]) => {
            if (key in el) el[key] = val;
        });
        return el;
    };

    /** Получает элемент по ID */
    const getElement = (id, type = HTMLElement) => {
        const el = document.getElementById(id);
        return el instanceof type ? el : null;
    };

    /** Устанавливает текст элемента */
    const setText = (el, text) => {
        if (el) el.textContent = text;
    };

    return Object.freeze({ createElement, getElement, setText });
})();

/** API сервис */
const ApiService = (() => {
    /** Проверяет ответ API */
    const isValidResponse = (data) => {
        return !!data && typeof data === 'object' &&
            'success' in data && data.success === true &&
            'content' in data && typeof data.content === 'string';
    };

    /** Получает конфигурацию */
    const fetchConfig = async (endpoint) => {
        const response = await fetch(`${AppConfig.URLS.API_BASE}${endpoint}`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!isValidResponse(data)) throw new Error('Invalid API response');
        return data;
    };

    return Object.freeze({ fetchConfig });
})();

/** Сервис состояния */
const StateService = (() => {
    const stateMap = new WeakMap();

    /** Сохраняет состояние элемента */
    const save = (el) => {
        stateMap.set(el, {
            text: el.textContent || '',
            handler: el.onclick
        });
    };

    /** Восстанавливает состояние */
    const restore = (el) => {
        const state = stateMap.get(el);
        if (state) {
            DOMService.setText(el, state.text);
            el.onclick = state.handler;
        }
    };

    /** Устанавливает состояние загрузки */
    const setLoading = (el, isLoading) => {
        if (el) {
            el.disabled = isLoading;
            el.classList.toggle('button--loading', isLoading);
        }
    };

    return Object.freeze({ save, restore, setLoading });
})();

/** Сервис загрузки */
const DownloadService = (() => {
    const activeDownloads = new Set();

    /** Инициирует загрузку */
    const download = (content, filename) => {
        if (activeDownloads.size >= AppConfig.CONSTANTS.MAX_CONCURRENT_DOWNLOADS) {
            throw new Error('Достигнут лимит одновременных загрузок');
        }

        const link = DOMService.createElement('a', {
            href: `data:application/octet-stream;base64,${content}`,
            download: filename,
            style: 'display:none'
        });

        activeDownloads.add(link);
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            link.remove();
            activeDownloads.delete(link);
        }, AppConfig.CONSTANTS.CLEANUP_DELAY_MS);
    };

    return Object.freeze({ download });
})();

/** Обработчик генерации конфигурации */
const handleConfigGeneration = async (buttonId, endpoint, prefix) => {
    const button = DOMService.getElement(buttonId, HTMLButtonElement);
    const statusEl = DOMService.getElement('status');
    const infoEl = DOMService.getElement('info');

    if (!button || !statusEl || !infoEl) return;

    StateService.save(button);
    const filename = `${prefix}-${IdGenerator.generate()}.conf`;

    try {
        StateService.setLoading(button, true);
        DOMService.setText(statusEl, AppConfig.CONSTANTS.STATUS.GENERATING);

        const config = await ApiService.fetchConfig(endpoint);
        updateDownloadButton(button, filename, config.content);
        await DownloadService.download(config.content, filename);

        DOMService.setText(statusEl, AppConfig.CONSTANTS.STATUS.SUCCESS);
    } catch (error) {
        console.error('Ошибка генерации:', error);
        DOMService.setText(statusEl, AppConfig.CONSTANTS.STATUS.ERROR);
        StateService.restore(button);
    } finally {
        StateService.setLoading(button, false);
        DOMService.setText(infoEl, statusEl?.textContent || '');
    }
};

/** Обновляет кнопку загрузки */
const updateDownloadButton = (button, filename, content) => {
    DOMService.setText(button, `Скачать ${filename}`);
    button.onclick = () => DownloadService.download(content, filename);
};

/** Инициализация приложения */
const initApp = () => {
    AppConfig.BUTTONS.forEach(btn => {
        const button = DOMService.getElement(btn.id, HTMLButtonElement);
        if (button) {
            DOMService.setText(button, btn.defaultText);
            button.addEventListener('click', 
                () => handleConfigGeneration(btn.id, btn.endpoint, btn.prefix)
            );
        }
    });

    const docsButton = DOMService.getElement('githubButton', HTMLButtonElement);
    if (docsButton) {
        docsButton.addEventListener('click', () => {
            window.location.href = AppConfig.URLS.DOCUMENTATION;
        });
    }
};

/** Запуск приложения */
const startApp = () => {
    if (document.readyState === 'complete') {
        initApp();
    } else {
        document.addEventListener('DOMContentLoaded', initApp);
    }
};

startApp();
