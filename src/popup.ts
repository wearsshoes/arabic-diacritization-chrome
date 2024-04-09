document.addEventListener('DOMContentLoaded', () => {
    const diacritizeBtn = document.getElementById('diacritizeBtn');
    const optionsBtn = document.getElementById('optionsBtn');

    if (diacritizeBtn) {
      diacritizeBtn.addEventListener('click', () => {
      // Send a message to the content script to start diacritization
      alert('Not implemented');
      //   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      //     if (tabs.length > 0 && tabs[0].id !== undefined) {
      //       chrome.tabs.sendMessage(tabs[0].id, { action: 'diacritize' });
      //     }
      //   });
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
          window.open(chrome.runtime.getURL('public/options.html'));
        }
      });
    }
  });
  