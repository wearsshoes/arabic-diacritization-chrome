document.addEventListener('DOMContentLoaded', () => {
    const diacritizeBtn = document.getElementById('diacritizeBtn');
    const arabiziBtn = document.getElementById('arabiziBtn');
    const optionsBtn = document.getElementById('optionsBtn');
    
    const sendMessageToContentScript = async (method: string) => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id === undefined) throw new Error('No active tab found');
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'sendToTranslate', method });
        console.log(`${method} response:`, response);
      } catch (error) {
        console.error(`Error in ${method}:`, error);
      }
    };
  
    diacritizeBtn?.addEventListener('click', () => sendMessageToContentScript('diacritize'));
    arabiziBtn?.addEventListener('click', () => sendMessageToContentScript('arabizi'));
    optionsBtn?.addEventListener('click', () => chrome.runtime.openOptionsPage());
    
  });