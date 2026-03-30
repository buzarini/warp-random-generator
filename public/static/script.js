let currentFileName = '';
let currentFileContent = '';

const domainInput = document.getElementById('domainInput');
const clearBtn = document.getElementById('clearDomain');
const levelSelect = document.getElementById('levelSelect');
const generateBtn = document.getElementById('generateBtn');
const statusDiv = document.getElementById('status');

// Функция извлечения домена из строки (убираем протокол, порт, путь)
function extractDomain(raw) {
    let domain = raw.trim();
    // Убираем протокол http:// или https://
    domain = domain.replace(/^https?:\/\//i, '');
    // Убираем всё после первого слэша или двоеточия с портом
    const slashIndex = domain.indexOf('/');
    if (slashIndex !== -1) domain = domain.substring(0, slashIndex);
    const colonIndex = domain.indexOf(':');
    if (colonIndex !== -1) domain = domain.substring(0, colonIndex);
    return domain;
}

// Показать статус
function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.classList.add('show');
    if (isError) {
        statusDiv.classList.add('error');
        statusDiv.classList.remove('success');
    } else {
        statusDiv.classList.add('success');
        statusDiv.classList.remove('error');
    }
}

// Скрыть статус
function hideStatus() {
    statusDiv.classList.remove('show', 'success', 'error');
    statusDiv.textContent = '';
}

// Сброс кнопки в исходное состояние
function resetButton() {
    generateBtn.disabled = false;
    generateBtn.textContent = 'Генерировать';
    currentFileName = '';
    currentFileContent = '';
}

// Загрузка файла
function downloadConfig(contentBase64, fileName) {
    const link = document.createElement('a');
    link.href = `data:application/octet-stream;base64,${contentBase64}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Обработка генерации
async function generate() {
    let domain = domainInput.value.trim();
    if (domain === '') {
        domain = 'www.google.com';
    } else {
        domain = extractDomain(domain);
    }

    const level = parseInt(levelSelect.value, 10);

    generateBtn.disabled = true;
    generateBtn.textContent = 'Генерация...';
    hideStatus();

    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain, level })
        });
        const data = await response.json();

        if (data.success) {
            const randomNum = Math.floor(Math.random() * (99 - 10 + 1) + 10);
            const fileName = data.fileName || `WARP_${randomNum}.conf`;
            currentFileName = fileName;
            currentFileContent = data.content;
            generateBtn.textContent = `Скачать ${fileName}`;
            generateBtn.disabled = false;
            showStatus(`Конфиг ${fileName} создан!`, false);
            // Автоматическое скачивание
            downloadConfig(data.content, fileName);
        } else {
            showStatus(data.message || 'Ошибка при генерации конфига.', true);
            resetButton();
        }
    } catch (err) {
        console.error(err);
        showStatus('Ошибка соединения с сервером.', true);
        resetButton();
    }
}

// Обработка клика по кнопке (генерация или повторное скачивание)
generateBtn.onclick = () => {
    if (currentFileName && currentFileContent) {
        // Повторное скачивание
        downloadConfig(currentFileContent, currentFileName);
        showStatus(`Файл ${currentFileName} перекачан!`, false);
    } else {
        generate();
    }
};

// Очистка поля + сброс всего
clearBtn.onclick = () => {
    domainInput.value = '';
    domainInput.focus();
    resetButton();
    hideStatus();
};

// При изменении уровня сбрасываем всё
levelSelect.onchange = () => {
    domainInput.value = '';
    resetButton();
    hideStatus();
};

// Обработка вставки: очищаем статус и сбрасываем кнопку, извлекаем домен
domainInput.addEventListener('input', () => {
    // Если пользователь вводит текст, сбрасываем состояние
    resetButton();
    hideStatus();
    // Если вставка содержит URL, преобразуем
    const raw = domainInput.value;
    const extracted = extractDomain(raw);
    if (extracted !== raw) {
        domainInput.value = extracted;
    }
});