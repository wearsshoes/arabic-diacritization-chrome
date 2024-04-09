document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get('apiKey', (data: { apiKey?: string }) => {
        const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
        if (apiKeyInput) {
            apiKeyInput.value = data.apiKey || '';
        }
    });

    const optionsForm = document.getElementById('optionsForm');
    if (optionsForm) {
        optionsForm.addEventListener('submit', (event: Event) => {
            event.preventDefault();
            const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
            if (apiKeyInput) {
                const apiKey = apiKeyInput.value;
                chrome.storage.sync.set({ apiKey }, () => {
                    alert('API Key saved!');
                });
            }
        });
    }
});
