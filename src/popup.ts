import { Prompt } from './types'

document.addEventListener('DOMContentLoaded', async() => {

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

  // Get the website language
  const languageDisplayElement = document.getElementById('pageLanguage');
  if (languageDisplayElement) {
    languageDisplayElement.innerHTML = 'Loading...';
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id === undefined) throw new Error('No active tab found');
      
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getWebsiteLanguage' });
      console.log('Website language:', response);  // Log the language
      const languageNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'language' });
      const languageNamesInArabic = new Intl.DisplayNames(['ar'], { type: 'language' });
      
      const lang = languageNamesInEnglish.of(response);
      const lang_ar = languageNamesInArabic.of(response);
      languageDisplayElement.textContent = 'Language: ' + lang + ' (' + lang_ar + ')';

    } catch (error) {
      console.error('Failed to get website language:', error);
      languageDisplayElement.textContent = 'Language: Unknown';
    }
  }

  // get selectedPrompt from storage
  const promptDisplayElement = document.getElementById('selectedPrompt');
  const promptLengthElement = document.getElementById('promptLength');
  if (promptDisplayElement && promptLengthElement) {
    chrome.storage.sync.get(['selectedPrompt'], (data: {selectedPrompt?: Prompt}) => {
      if (data.selectedPrompt) {

        const prompt = data.selectedPrompt.name || 'No prompt selected';
        promptDisplayElement.textContent = "Prompt: " + prompt;

        // We should store the prompt length to avoid this call
        chrome.runtime.sendMessage({action: "getSystemPromptLength", prompt: data.selectedPrompt.text}, (response) => {
          if (response) {promptLengthElement.textContent = "Prompt Length: " + response;}
        });
      }
    });
  }
});
