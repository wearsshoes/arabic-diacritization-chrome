import { Prompt } from './types'

document.addEventListener('DOMContentLoaded', async () => {
  const diacritizeBtn = document.getElementById('diacritizeBtn');
  const arabiziBtn = document.getElementById('arabiziBtn');
  const optionsBtn = document.getElementById('optionsBtn');
  const diacritizeMessage = document.getElementById('diacritizeMessage');
  const languageDisplayElement = document.getElementById('pageLanguage');
  const characterCountElement = document.getElementById('characterCount');
  const outputTokenCountElement = document.getElementById('outputTokenCount');
  const promptDisplayElement = document.getElementById('selectedPrompt');
  const promptLengthElement = document.getElementById('promptLength');
  const modelDisplayElement = document.getElementById('model');
  const calculateBtn = document.getElementById('calculateBtn');
  const costElement = document.getElementById('costEstimate');

  const beginDiacritization = async (method: string) => {
    try {
      const response = chrome.runtime.sendMessage({ action: 'sendToDiacritize', method });
      console.log(`${method} response:`, response);
    } catch (error) {
      console.error(`Error in ${method}:`, error);
    }
  };

  const checkApiKey = () => {
    chrome.storage.sync.get(['apiKey'], (data) => {
      if (!data.apiKey) {
        const button = document.createElement('button');
        button.textContent = 'Please set your API key in the options page.';
        document.getElementById('main')?.replaceChildren(button);
        button.addEventListener('click', () => chrome.runtime.openOptionsPage());
      }
    });
  };

  const getWebsiteLanguage = async () => {
    if (!languageDisplayElement) return;
  
    languageDisplayElement.textContent = 'Loading...';
  
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id === undefined) throw new Error('No active tab found');
  
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getWebsiteLanguage' });
      console.log('Website language:', response);
  
      const languageNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'language' });
      const languageNamesInArabic = new Intl.DisplayNames(['ar'], { type: 'language' });
      const lang = languageNamesInEnglish.of(response);
      const lang_ar = languageNamesInArabic.of(response);
      languageDisplayElement.textContent = `Language: ${lang} (${lang_ar})`;
  
      updateDiacritizeMessage(response);
    } catch (error) {
      console.error('Failed to get website language:', error);
      languageDisplayElement.textContent = 'Language: Unknown';
      updateDiacritizeMessage(null);
    }
  };
  
  const updateDiacritizeMessage = (language: string | null) => {
    if (!diacritizeMessage) return;
  
    const arabicDialects = ['ar', 'ar-AE', 'ar-BH', 'ar-DZ', 'ar-EG', 'ar-IQ', 'ar-JO', 'ar-KW', 'ar-LB', 'ar-LY', 'ar-MA', 'ar-OM', 'ar-QA', 'ar-SA', 'ar-SD', 'ar-SY', 'ar-TN', 'ar-YE'];
  
    if (language && arabicDialects.includes(language)) {
      diacritizeMessage.textContent = 'This website is in Arabic.';
      diacritizeMessage.style.color = 'green';
      diacritizeBtn?.removeAttribute('disabled');
      arabiziBtn?.removeAttribute('disabled');
    } else {
      diacritizeMessage.textContent = language ? 'Warning! This website is not in Arabic.' : 'Warning! This website may not be in Arabic.';
      diacritizeMessage.style.setProperty('color', 'red');
      diacritizeBtn?.setAttribute('disabled', 'true');
      arabiziBtn?.setAttribute('disabled', 'true');
    }
  };

  const getWebsiteCharacterCount = async () => {
    if (characterCountElement) {
      characterCountElement.textContent = 'Loading...';
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id === undefined) throw new Error('No active tab found');

        console.log('Sending message to get text length');
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getWebsiteCharacterCount' });
        console.log('Text length:', response.chars);
        a.chars = response.chars;
        a.batches = response.batches;
        characterCountElement.textContent = `Character Count: ${response.chars}`;

        if (outputTokenCountElement) {
          const outputTokens = (response.chars * 2.3).toFixed(0);
          outputTokenCountElement.textContent = `Estimated output token count: ${outputTokens}`;
        }
      } catch (error) {
        console.error('Failed to get text length:', error);
        characterCountElement.textContent = 'Character Count: Unknown';
      }
    }
  };

  const getSelectedPrompt = () => {
    if (promptDisplayElement && promptLengthElement) {
      chrome.storage.sync.get(['selectedPrompt'], (data: { selectedPrompt?: Prompt }) => {
        if (data.selectedPrompt) {
          const task = data.selectedPrompt.name || 'No task selected';
          promptDisplayElement.textContent = `Task: ${task}`;

          chrome.runtime.sendMessage({ action: 'getSystemPromptLength', prompt: data.selectedPrompt.text }, (response) => {
            if (response) {
              promptLengthElement.textContent = `Prompt Length: ${response}`;
              a.promptLength = response;
            }
          });
        }
      });
    }
  };

  const updateModelDisplay = () => {
    if (modelDisplayElement) {
      modelDisplayElement.textContent = 'Model: Claude Haiku';
    }
  };

  const calculateCost = () => {
    if (costElement && a.batches && a.chars && a.promptLength) {
      const costEstimate = calculateCostEstimate();
      const costInDollars = costEstimate.toFixed(2);
      costElement.textContent = `Estimated cost: $${costInDollars}`;
    } else if (costElement) {
      costElement.textContent = 'Estimated cost: Unknown';
    }
  };

  const calculateCostEstimate = (): number => {
    const inputCost = 0.25 / 1000000;
    const inputSubtotal = (a.promptLength * a.batches + a.chars) * inputCost;
    const outputCost = 1.25 / 1000000;
    const outputSubtotal = a.chars * 2.3 * outputCost;
    const totalCostPlusTax = (inputSubtotal + outputSubtotal) * 1.1;
    return totalCostPlusTax;
  };

  diacritizeBtn?.addEventListener('click', () => beginDiacritization('diacritize'));
  arabiziBtn?.addEventListener('click', () => beginDiacritization('arabizi'));
  optionsBtn?.addEventListener('click', () => chrome.runtime.openOptionsPage());
  calculateBtn?.addEventListener('click', calculateCost);

  checkApiKey();
  getWebsiteLanguage();
  getWebsiteCharacterCount();
  getSelectedPrompt();
  updateModelDisplay();
});

let a: { [key: string]: number } = {};