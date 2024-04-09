document.addEventListener('DOMContentLoaded', () => {
    const diacritizeBtn = document.getElementById('diacritizeBtn');
  
    if (diacritizeBtn) {
      diacritizeBtn.addEventListener('click', () => {
        // Send a message to the content script to start diacritization
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length > 0 && tabs[0].id !== undefined) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'diacritize' });
          }
        });
      });
    }
  });
  