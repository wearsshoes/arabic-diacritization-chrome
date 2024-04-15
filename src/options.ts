import defaultPrompts from './defaultPrompts.json';
import { Prompt } from './types';

document.addEventListener('DOMContentLoaded', async () => {

  const llmChoice = document.getElementById('llmChoice') as HTMLInputElement;

  const promptInput = document.getElementById('customPromptTextArea') as HTMLInputElement;
  const promptSelect = document.getElementById('loadPrompt') as HTMLSelectElement;
  const saveNewPrompt = document.getElementById('savePromptForm');
  const newPromptName = document.getElementById('newPromptName') as HTMLInputElement;
  const deletePromptBtn = document.getElementById('deletePromptBtn');

  const optionsForm = document.getElementById('optionsForm');
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  const savedKeyDisplay = document.getElementById('savedKey') as HTMLParagraphElement;
  const savedTimeDisplay = document.getElementById('savedTime') as HTMLParagraphElement;
  const clearBtn = document.getElementById('clearBtn');

  const clearDatabaseBtn = document.getElementById('clearDatabaseBtn');
  const clearCacheBtn = document.getElementById('clearCacheBtn');

  // load the API key
  chrome.storage.sync.get(['apiKey', 'savedAt'], (data: { apiKey?: string; savedAt?: string }) => {
    if (apiKeyInput && savedKeyDisplay && savedTimeDisplay) {
      apiKeyInput.value = data.apiKey || '';
      savedKeyDisplay.textContent = `Current saved key: ${data.apiKey || 'None'}`;
      savedTimeDisplay.textContent = `Last saved at: ${data.savedAt || 'Never'}`;
    }
  });
  // load llm choice
  chrome.storage.sync.get(['llmChoice'], (data: { llmChoice?: string }) => {
    if (llmChoice) {
      llmChoice.value = data.llmChoice || 'haiku';
    }
  });
  // load the last selected prompt
  chrome.storage.sync.get(['selectedPrompt'], (data: { selectedPrompt?: Prompt }) => {
    if (promptInput) {
      promptInput.style.color = 'grey';
      const selected = data.selectedPrompt?.name;
      promptInput.value = allPrompts[0].text || '';
      if (selected) {
        for (const prompt of allPrompts) {
          if (prompt.name === selected) {
            promptInput.value = prompt.text;
            if (promptSelect) {
              promptSelect.value = prompt.name;
            }
          }
        }
      }
    }
  });

  // add the names of all the default prompts to the dropdown from defaultPrompts.json, and all the custom prompts from savedPrompts.
  chrome.storage.sync.get(['savedPrompts'], (data: { savedPrompts?: Prompt[] }) => {
    if (data.savedPrompts) {
      for (const prompt of data.savedPrompts) {
        allPrompts.push(prompt);
      }
    } else {
      // should return an error message here instead
      console.log("Error: no prompts saved");
    }
    if (promptSelect) {
      for (const prompt of allPrompts) {
        const option = document.createElement('option');
        option.value = prompt.name;
        option.text = prompt.name;
        promptSelect.add(option);
      };
    }
  });

  // save value of llmChoice
  llmChoice?.addEventListener('change', (event: Event) => {
    const target = event.target as HTMLInputElement;
    chrome.storage.sync.set({ llmChoice: target.value });
  });

  // based on which prompt is selected, populate the custom prompt textarea with the selected prompt.
  promptSelect?.addEventListener('change', () => {
    if (promptInput) {
      const selected = promptSelect?.selectedOptions[0].value;
      for (const prompt of allPrompts) {
        if (prompt.name === selected) {
          promptInput.value = prompt.text;
          // save the selected prompt as last selected prompt
          chrome.storage.sync.set({ selectedPrompt: prompt });
        }
      }
      promptInput.style.color = 'grey';
    }
  });

  // make the text color gray unless the prompt is edited.
  promptInput?.addEventListener('input', () => {
    if (promptInput) {
      promptInput.style.color = 'black';
    }
  });

  // save the custom prompt to the saved prompts list
  saveNewPrompt?.addEventListener('submit', (event: Event) => {
    event.preventDefault();
    if (promptInput && newPromptName) {
      const text = promptInput.value;
      if (!text) {
        alert('Please enter a prompt to save.');
        return;
      }
      const name = newPromptName.value;
      if (!name) {
        alert('Please enter a name for the prompt.');
        return;
      }
      const prompt = { name, text };
      chrome.storage.sync.get(['savedPrompts'], (data: { savedPrompts?: Prompt[] }) => {
        const savedPrompts = data.savedPrompts || [];
        savedPrompts.push(prompt);
        allPrompts.push(prompt);
        chrome.storage.sync.set({ savedPrompts }, () => {
          alert('Prompt saved!');
        });
      });
      if (promptSelect && promptInput) {
        for (const prompt of allPrompts) {
          if (prompt.name === name) {
            const option = document.createElement('option');
            option.value = name;
            option.text = name;
            promptSelect.add(option);
          }
        }
        promptInput.style.color = 'grey';
      }
    }
  });

  // delete current prompt from saved prompts list and remove it from options.
  deletePromptBtn?.addEventListener('click', () => {
    if (promptSelect && promptInput) {
      const selected = promptSelect.selectedOptions[0].value;
      chrome.storage.sync.get(['savedPrompts'], (data: { savedPrompts?: Prompt[] }) => {
        const newPrompts = data.savedPrompts?.filter((prompt) => prompt.name !== selected);
        allPrompts = allPrompts.filter((prompt) => prompt.name !== selected);
        chrome.storage.sync.set({ savedPrompts: newPrompts }, () => {
          alert('Prompt deleted!');
          promptInput.value = '';
          promptInput.style.color = 'grey';
          promptSelect.remove(promptSelect.selectedIndex);
        });
      });
    }
  });

  // save the API key
  optionsForm?.addEventListener('submit', (event: Event) => {
    event.preventDefault();
    if (apiKeyInput) {
      const apiKey = apiKeyInput.value;
      const apiKeySavedAt = new Date().toLocaleString();
      chrome.storage.sync.set({ apiKey, apiKeySavedAt: apiKeySavedAt }, () => {
        alert('API Key saved!');
        if (savedKeyDisplay && savedTimeDisplay) {
          savedKeyDisplay.textContent = `Current saved key: ${apiKey}`;
          savedTimeDisplay.textContent = `Last saved at: ${apiKeySavedAt}`;
        }
      });
    }
  });

  // Clear the API key
  clearBtn?.addEventListener('click', () => {
    if (confirm('Are you sure you want to remove the API Key?')) {
      chrome.storage.sync.remove(['apiKey', 'savedAt'], () => {
        chrome.runtime.reload();
      });
    }
  });

  // Clear cache content
  clearCacheBtn?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the cache?')) {
      alert('jk, lol: Cache clearing is disabled in this version.');
      // chrome.storage.sync.remove(['cache'], () => {
      //     alert('Cache cleared!');
      // });
    }
  });

  // Clear database content
  clearDatabaseBtn?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the database?')) {
      chrome.runtime.sendMessage({ action: 'clearDatabase' }, (response) => {
        if (response && response.message === 'Database cleared.') {
          alert('Database cleared!');
        } else {
          alert('Failed to clear the database.');
        }
      });
    }
  });

});

let allPrompts: Prompt[] = defaultPrompts;