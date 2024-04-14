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
  // this should go to background script instead.
  diacritizeBtn?.addEventListener('click', () => sendMessageToContentScript('diacritize'));

  const arabiziBtn = document.getElementById('arabiziBtn');
  arabiziBtn?.addEventListener('click', () => sendMessageToContentScript('arabizi'));
  
  const optionsBtn = document.getElementById('optionsBtn');
  optionsBtn?.addEventListener('click', () => chrome.runtime.openOptionsPage());    

  const sendMessageToContentScript = async (method: string) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id === undefined) throw new Error('No active tab found');
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'sendToDiacritize', method });
      console.log(`${method} response:`, response);
    } catch (error) {
      console.error(`Error in ${method}:`, error);
    }
  };

  // Get the website language
  const diacritizeMessage = document.getElementById('diacritizeMessage');
  const languageDisplayElement = document.getElementById('pageLanguage');
  if (languageDisplayElement) {
    languageDisplayElement.textContent = 'Loading...';
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id === undefined) throw new Error('No active tab found');
      
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getWebsiteLanguage' });
      console.log('Website language:', response);  // Log the language
      const languageNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'language' });
      const languageNamesInArabic = new Intl.DisplayNames(['ar'], { type: 'language' });
      
      const lang = languageNamesInEnglish.of(response);
      const lang_ar = languageNamesInArabic.of(response);
      const arabicDialects = ['ar', 'ar-AE', 'ar-BH', 'ar-DZ', 'ar-EG', 'ar-IQ', 'ar-JO', 'ar-KW', 'ar-LB', 'ar-LY', 'ar-MA', 'ar-OM', 'ar-QA', 'ar-SA', 'ar-SD', 'ar-SY', 'ar-TN', 'ar-YE'];
      languageDisplayElement.textContent = 'Language: ' + lang + ' (' + lang_ar + ')';
      if (diacritizeMessage) {
        if (arabicDialects.includes(response)) {
          diacritizeMessage.textContent = 'This website is in Arabic.';
          diacritizeMessage.style.color = 'green';
          diacritizeBtn?.removeAttribute('disabled');
          arabiziBtn?.removeAttribute('disabled');

        } else {
          diacritizeMessage.textContent = 'Warning! This website is not in Arabic.';
          diacritizeMessage.style.setProperty('color', 'red');
          diacritizeBtn?.setAttribute('disabled', 'true');
          arabiziBtn?.setAttribute('disabled', 'true'); 
        }
      }
    } catch (error) {
      console.error('Failed to get website language:', error);
      languageDisplayElement.textContent = 'Language: Unknown';
      if (diacritizeMessage) {diacritizeMessage.textContent = 'Warning! This website may not be in Arabic.'};
      // grey out the diacritize button
      diacritizeMessage?.style.setProperty('color', 'red');
      diacritizeBtn?.removeAttribute('disabled');
      arabiziBtn?.removeAttribute('disabled');
    }
  }

  // get the website text length
  const characterCountElement = document.getElementById('characterCount');
  const outputTokenCountElement = document.getElementById('outputTokenCount');
  if (characterCountElement) {
    characterCountElement.textContent = 'Loading...';
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id === undefined) throw new Error('No active tab found');
      
      console.log('Sending message to get text length');
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getWebsiteCharacterCount' });
      console.log('Text length:', response.chars);  // Log the text length
      a.chars = response.chars
      a.batches = response.batches
      characterCountElement.textContent = 'Character Count: ' + response.chars;

      // Output tokens assuming 2.3 tokens per input character, if Arabic characters and diacritics are all 1 token each
      if (outputTokenCountElement) {
        const outputTokens = (response.chars * 2.3).toFixed(0);
        outputTokenCountElement.textContent = 'Estimated output token count: ' + outputTokens;
      }

    } catch (error) {
      console.error('Failed to get text length:', error);
      characterCountElement.textContent = 'Character Count: Unknown';
    }
  }

  // get selectedPrompt from storage
  const promptDisplayElement = document.getElementById('selectedPrompt');
  const promptLengthElement = document.getElementById('promptLength');
  if (promptDisplayElement && promptLengthElement) {
    chrome.storage.sync.get(['selectedPrompt'], (data: {selectedPrompt?: Prompt}) => {
      if (data.selectedPrompt) {

        const task = data.selectedPrompt.name || 'No task selected';
        promptDisplayElement.textContent = "Task: " + task;

        // We should store the prompt length to avoid this call
        chrome.runtime.sendMessage({action: "getSystemPromptLength", prompt: data.selectedPrompt.text}, (response) => {
          if (response) {
            promptLengthElement.textContent = "Prompt Length: " + response;
            a.promptLength = response
          }
        });
      }
    });
  }

  const modelDisplayElement = document.getElementById('model');
  if (modelDisplayElement) {
    modelDisplayElement.textContent = 'Model: Claude Haiku';
    // chrome.storage.sync.get(['selectedModel'], (data) => {
    //   if (data.selectedModel) {
    //     modelDisplayElement.textContent = "Model: " + data.selectedModel.name;
    //   } else {
    //     modelDisplayElement.textContent = "Model: No model selected";
    //   }
    // });
  }

  // calculate the cost of translation
  const calculateBtn = document.getElementById('calculateBtn');
  calculateBtn?.addEventListener('click', () => {
    const costElement = document.getElementById('costEstimate');
    if (costElement && a.batches && a.chars && a.promptLength) {
      const costEstimate = calculateCost()
      const costInDollars = costEstimate.toFixed(2);
      costElement.textContent = 'Estimated cost: $' + costInDollars;
    } else if (costElement) {
      costElement.textContent = 'Estimated cost: Unknown';
    }
  });
});

let a: { [key: string]: number } = {}

// function for calculating cost of translation
function calculateCost(): number {
  // if (dictOfThings.model != 0) return "I can't calculate the cost for this model yet";
  
  const inputCost = 0.25/1000000; // $0.25 per million tokens
  const inputSubtotal = ((a.promptLength * a.batches) + a.chars) * inputCost;
  const outputCost = 1.25/1000000; // $1.25 per million tokens
  const outputSubtotal = (a.chars * 2.3) * outputCost;
  
  // 10% tax for bad outputs lmao
  const totalCostPlusTax = (inputSubtotal + outputSubtotal) * 1.1;
  return totalCostPlusTax
}