document.addEventListener('DOMContentLoaded', () => {
    const diacritizeBtn = document.getElementById('diacritizeBtn');
    const arabiziBtn = document.getElementById('arabiziBtn');
    const optionsBtn = document.getElementById('optionsBtn');

    if (diacritizeBtn) {
      diacritizeBtn.addEventListener('click', () => {
      // Send a message to the content script to start diacritization
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length > 0 && tabs[0].id !== undefined) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'sendToTranslate', method: 'diacritize' }, (response) => {
              if (chrome.runtime.lastError) {
                console.error('Error sending message:', chrome.runtime.lastError);
              } else {
                console.log('Diacritization response:', response);
                // Handle the response from the content script if needed
              }
            });
          }
        });
      });
    }

    if (arabiziBtn) {
      arabiziBtn.addEventListener('click', () => {
      // Send a message to the content script to start diacritization
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length > 0 && tabs[0].id !== undefined) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'sendToTranslate', method: 'arabizi' }, (response) => {
              if (chrome.runtime.lastError) {
                console.error('Error sending message:', chrome.runtime.lastError);
              } else {
                console.log('Arabizi response:', response);
                // Handle the response from the content script if needed
              }
            });
          }
        });
      });
    } 

    if (optionsBtn) {
      optionsBtn.addEventListener('click', () => {
        // Open the options page
        if (chrome.runtime.openOptionsPage) {
          // New way to open options pages, if supported (Chrome 42+).
          chrome.runtime.openOptionsPage();
        } else {
          // Reasonable fallback.
          chrome.tabs.create({url: 'dist/options.html'});
        }
      });
    }
  });
  