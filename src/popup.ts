document.addEventListener('DOMContentLoaded', () => {
    const diacritizeBtn = document.getElementById('diacritizeBtn');
    const optionsBtn = document.getElementById('optionsBtn');

    if (diacritizeBtn) {
      diacritizeBtn.addEventListener('click', () => {
      // temp not implemented
        const messageDiv = document.getElementById('notImplementedMsg');
        if (messageDiv) {
          messageDiv.textContent = 'Not implemented';
        }
      });
      
      // Send a message to the content script to start diacritization
      //   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      //     if (tabs.length > 0 && tabs[0].id !== undefined) {
      //       chrome.tabs.sendMessage(tabs[0].id, { action: 'diacritize' });
      //     }
      //   });
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
  