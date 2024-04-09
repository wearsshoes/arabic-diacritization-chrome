document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(['apiKey', 'savedAt'], (data: { apiKey?: string; savedAt?: string }) => {
        const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
        const savedKeyDisplay = document.getElementById('savedKey') as HTMLParagraphElement;
        const savedTimeDisplay = document.getElementById('savedTime') as HTMLParagraphElement;

        if (apiKeyInput && savedKeyDisplay && savedTimeDisplay) {
            apiKeyInput.value = data.apiKey || '';
            savedKeyDisplay.textContent = `Current saved key: ${data.apiKey || 'None'}`;
            savedTimeDisplay.textContent = `Last saved at: ${data.savedAt || 'Never'}`;
        }
    });

    const optionsForm = document.getElementById('optionsForm');
    if (optionsForm) {
        optionsForm.addEventListener('submit', (event: Event) => {
            event.preventDefault();
            const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
            if (apiKeyInput) {
                const apiKey = apiKeyInput.value;
                const savedAt = new Date().toLocaleString();
                chrome.storage.sync.set({ apiKey, savedAt }, () => {
                    alert('API Key saved!');
                    const savedKeyDisplay = document.getElementById('savedKey') as HTMLParagraphElement;
                    const savedTimeDisplay = document.getElementById('savedTime') as HTMLParagraphElement;
                    if (savedKeyDisplay && savedTimeDisplay) {
                        savedKeyDisplay.textContent = `Current saved key: ${apiKey}`;
                        savedTimeDisplay.textContent = `Last saved at: ${savedAt}`;
                    }
                });
            }
        });
    }
});
