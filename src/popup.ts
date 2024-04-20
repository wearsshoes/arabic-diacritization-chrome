import { Prompt } from './types'
import { getAPIKey } from './utils';

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

  const checkApiKey = () => {
    const apiKey = getAPIKey()
    if (!apiKey) {
      const button = document.createElement('button');
      button.textContent = 'Please set your API key in the options page.';
      document.getElementById('main')?.replaceChildren(button);
      button.addEventListener('click', () => chrome.runtime.openOptionsPage());
    }
  }

  const beginDiacritization = async (method: string) => {
    console.log(`Sending ${method} request...`);
    try {
      const response = chrome.runtime.sendMessage({ action: 'sendToDiacritize', method });
      console.log(`${method} response:`, response);
    } catch (error) {
      console.error(`Error in ${method}:`, error);
    }
  };

  const getWebsiteData = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id === undefined) throw new Error('No active tab found');

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getWebsiteData' });
      console.log('Website data:', response);

      
      // Update language display
      updateLanguageDisplay(response.language);
      
      // broke response.batches, so:
      const batches = response.chars / 675
      
      // Update character count and token estimate
      updateCharacterCount(response.chars, batches);
      if (!response.metadataReady) {
        throw new Error('Metadata not ready.');
      }
    } catch (error) {
      console.error('Failed to get complete website data:', error);
      updateLanguageDisplay(null);
      updateCharacterCount(NaN, NaN);
    }
  };

  const updateLanguageDisplay = (language: string | null) => {
    if (!languageDisplayElement) return;

    languageDisplayElement.textContent = 'Loading...';

    if (language) {
      const languageNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'language' });
      const languageNamesInArabic = new Intl.DisplayNames(['ar'], { type: 'language' });
      const lang = languageNamesInEnglish.of(language);
      const lang_ar = languageNamesInArabic.of(language);
      languageDisplayElement.textContent = `Language: ${lang} (${lang_ar})`;

      updateDiacritizeMessage(language);
    } else {
      console.error('Failed to get website language.');
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

  const updateCharacterCount = (chars: number, batches: number) => {
    if (!characterCountElement || !outputTokenCountElement) return;
    characterCountElement.textContent = `Character Count: ${chars}`;
    const outputTokens = (chars * 2.3).toFixed(0);
    outputTokenCountElement.textContent = `Estimated output token count: ${outputTokens}`;
    a.chars = chars;
    a.batches = batches;
  }

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
  getWebsiteData();
  getSelectedPrompt();
  updateModelDisplay();
});

let a: { [key: string]: number } = {};