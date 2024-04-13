document.addEventListener('DOMContentLoaded', () => {

  // when the popup is opened, check if the api key is set
  chrome.storage.sync.get(['apiKey'], (data) => {
    if (!data.apiKey) {
      const button = document.createElement('button');
      button.textContent = 'Please set your API key in the options page.';
      document.getElementById('main')?.replaceChildren(button);
      button.addEventListener('click', () => chrome.runtime.openOptionsPage());    
    }
  });

  const diacritizeBtn = document.getElementById('diacritizeBtn');
  diacritizeBtn?.addEventListener('click', () => sendMessageToContentScript('diacritize'));

  const arabiziBtn = document.getElementById('arabiziBtn');
  arabiziBtn?.addEventListener('click', () => sendMessageToContentScript('arabizi'));
  
  const optionsBtn = document.getElementById('optionsBtn');
  optionsBtn?.addEventListener('click', () => chrome.runtime.openOptionsPage());    

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
    
});