const domainInput = document.getElementById('domainInput');
const clearBtn = document.getElementById('clearBtn');
const generateBtn = document.getElementById('generateBtn');
const statusDiv = document.getElementById('status');

let currentConfigBase64 = null;      // сохранённый конфиг для повторного скачивания
let currentFileName = null;          // имя последнего файла
let lastError = null;                // последняя ошибка (не скрываем до успеха)

// Извлечение домена из строки (URL или просто домен)
function extractDomain(str) {
    str = str.trim();
    // Удаляем протокол
    str = str.replace(/^https?:\/\//i, '');
    // Удаляем всё после : или /
    str = str.split('/')[0].split(':')[0];
    return str || '';
}

// Обновление состояния кнопки
function resetButton() {
    generateBtn.textContent = 'Сгенерировать';
    currentConfigBase64 = null;
    currentFileName = null;
}

// Показать статус (успех или ошибка)
function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    if (isError) {
        statusDiv.style.color = '#f15874';
        lastError = message;
    } else {
        statusDiv.style.color = '#4CAF50';
        // при успехе ошибка забывается
        lastError = null;
    }
}

// Скрыть статус (например, при изменении поля)
function hideStatus() {
    statusDiv.style.display = 'none';
    statusDiv.textContent = '';
}

// Обработка ввода домена
domainInput.addEventListener('input', () => {
    resetButton();
    // Если есть поле ввода — скрываем статус (кроме случая, если это ошибка, которая ещё не перезаписана успехом)
    if (lastError) {
        // Оставляем ошибку, но при успехе потом уберём
    } else {
        hideStatus();
    }
});

// Очистка поля
clearBtn.addEventListener('click', () => {
    domainInput.value = '';
    resetButton();
    hideStatus();
});

// Кнопка генерации
generateBtn.addEventListener('click', async () => {
    // Если уже есть сгенерированный конфиг — повторно скачиваем его
    if (currentConfigBase64) {
        downloadConfig(currentConfigBase64, currentFileName);
        return;
    }

    // Иначе генерируем новый
    let domain = extractDomain(domainInput.value);
    if (!domain) {
        domain = 'www.google.com';
    }

    // Блокируем кнопку на время генерации
    generateBtn.disabled = true;
    generateBtn.classList.add('button--loading');
    showStatus('Генерация...');

    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain })
        });
        const data = await response.json();

        if (data.success) {
            // Случайное число для имени файла
            const randomNum = Math.floor(Math.random() * (99 - 10 + 1)) + 10;
            const fileName = `WARP_${randomNum}.conf`;
            currentFileName = fileName;
            currentConfigBase64 = data.content;

            // Меняем кнопку
            generateBtn.textContent = fileName;
            downloadConfig(data.content, fileName);
            showStatus('Конфиг успешно сгенерирован!');
        } else {
            showStatus('Ошибка: ' + (data.message || 'Неизвестная ошибка'), true);
        }
    } catch (err) {
        showStatus('Ошибка сети: ' + err.message, true);
    } finally {
        generateBtn.disabled = false;
        generateBtn.classList.remove('button--loading');
    }
});

// Скачивание конфига
function downloadConfig(base64, fileName) {
    const link = document.createElement('a');
    link.href = 'data:application/octet-stream;base64,' + base64;
    link.download = fileName;
    link.click();
}

// При вставке из буфера обрабатываем
domainInput.addEventListener('paste', (e) => {
    setTimeout(() => {
        const raw = domainInput.value;
        const cleaned = extractDomain(raw);
        if (cleaned !== raw) {
            domainInput.value = cleaned;
        }
        resetButton();
        hideStatus();
    }, 0);
});