document.addEventListener('DOMContentLoaded', function() {
    const elements = {
        generateButton: document.getElementById('generateButton'),
        buttonText: document.querySelector('#generateButton .button__text'),
        domainInput: document.getElementById('domainInput'),
        status: document.getElementById('status')
    };
    
    let currentConfig = null;
    let currentFileName = null;
    
    // Проверка домена
    function validateDomain(domain) {
        if (!domain || typeof domain !== 'string') {
            return 'www.google.com';
        }
        
        domain = domain.trim();
        
        // Удаляем протокол если есть
        domain = domain.replace(/^(https?:\/\/)/, '');
        
        // Удаляем слэш в конце если есть
        domain = domain.replace(/\/$/, '');
        
        // Проверяем, что домен содержит точку и не содержит пробелов
        if (domain.includes('.') && !domain.includes(' ')) {
            return domain;
        }
        
        return 'www.google.com';
    }
    
    // Генерация случайного числа от 10 до 99
    function getRandomNumber() {
        return Math.floor(Math.random() * (99 - 10 + 1)) + 10;
    }
    
    // Скачивание конфига
    function downloadConfig() {
        if (!currentConfig) return;
        
        const link = document.createElement('a');
        link.href = `data:application/octet-stream;base64,${currentConfig}`;
        link.download = currentFileName;
        link.click();
    }
    
    // Обновление состояния кнопки
    function updateButtonState(loading, isDownloadMode = false) {
        elements.generateButton.disabled = loading;
        
        if (loading) {
            elements.generateButton.classList.add('button--loading');
        } else {
            elements.generateButton.classList.remove('button--loading');
            
            if (isDownloadMode) {
                elements.buttonText.textContent = `Скачать ${currentFileName}`;
            } else {
                elements.buttonText.textContent = 'Сгенерировать конфиг';
            }
        }
    }
    
    // Обновление статуса
    function updateStatus(message, isError = false) {
        elements.status.textContent = message;
        elements.status.className = 'status ' + (isError ? 'error' : 'success');
    }
    
    // Очистка статуса
    function clearStatus() {
        elements.status.textContent = '';
        elements.status.className = 'status';
    }
    
    // Генерация конфига
    async function generateConfig() {
        // Если уже есть сгенерированный конфиг, просто скачиваем его
        if (currentConfig && currentFileName) {
            downloadConfig();
            return;
        }
        
        const domain = validateDomain(elements.domainInput.value);
        const randomNumber = getRandomNumber();
        
        // Обновляем домен в поле ввода если он был изменен
        if (domain !== elements.domainInput.value) {
            elements.domainInput.value = domain;
        }
        
        updateButtonState(true);
        clearStatus();
        
        try {
            const response = await fetch(`/warp1w?domain=${encodeURIComponent(domain)}`);
            const data = await response.json();
            
            if (data.success) {
                currentConfig = data.content;
                currentFileName = `WARP_${randomNumber}.conf`;
                
                // Обновляем кнопку для скачивания
                updateButtonState(false, true);
                updateStatus('Конфиг успешно сгенерирован!');
                
                // Автоматическое скачивание
                setTimeout(() => {
                    downloadConfig();
                }, 100);
            } else {
                updateStatus(`Ошибка: ${data.message}`, true);
                updateButtonState(false);
            }
        } catch (error) {
            updateStatus('Произошла ошибка при генерации.', true);
            updateButtonState(false);
            console.error('Ошибка:', error);
        }
    }
    
    // Обработчики событий
    elements.generateButton.addEventListener('click', generateConfig);
    
    // Сброс при изменении домена
    elements.domainInput.addEventListener('input', function() {
        if (currentConfig) {
            currentConfig = null;
            currentFileName = null;
            updateButtonState(false);
            clearStatus();
        }
    });
    
    // Валидация домена при потере фокуса
    elements.domainInput.addEventListener('blur', function() {
        const validDomain = validateDomain(this.value);
        if (validDomain !== this.value) {
            this.value = validDomain;
        }
    });
    
    // Enter для генерации
    elements.domainInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            generateConfig();
        }
    });
});