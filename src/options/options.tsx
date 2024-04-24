import React, { useEffect, useState } from 'react';

// import defaultPrompts from '../common/defaultPrompts.json';
// import { Prompt } from '../common/types';

const Options: React.FC = () => {
  // const [llmChoice, setLlmChoice] = useState('haiku');
  // const [customPrompt, setCustomPrompt] = useState('');
  // const [savedPrompts, setSavedPrompts] = useState<Prompt[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [savedKeyDisplay, setSavedKeyDisplay] = useState('');
  const [savedTimeDisplay, setSavedTimeDisplay] = useState('');

  useEffect(() => {
    // Load the API key
    chrome.storage.sync.get(['apiKey', 'savedAt'], (data: { apiKey?: string; savedAt?: string }) => {
      setApiKey(data.apiKey || '');
      setSavedKeyDisplay(data.apiKey || 'None');
      setSavedTimeDisplay(data.savedAt || 'Never');
    });

    //   // Load LLM choice
    //   chrome.storage.sync.get(['llmChoice'], (data: { llmChoice?: string }) => {
    //     setLlmChoice(data.llmChoice || 'haiku');
    //   });

    //   // Load the last selected prompt
    //   chrome.storage.sync.get(['selectedPrompt'], (data: { selectedPrompt?: Prompt }) => {
    //     const selected = data.selectedPrompt?.name;
    //     setCustomPrompt(defaultPrompts[0].text || '');
    //     if (selected) {
    //       const selectedPrompt = defaultPrompts.find((prompt) => prompt.name === selected);
    //       if (selectedPrompt) {
    //         setCustomPrompt(selectedPrompt.text);
    //       }
    //     }
    //   });

    //   // Load saved prompts
    //   chrome.storage.sync.get(['savedPrompts'], (data: { savedPrompts?: Prompt[] }) => {
    //     if (data.savedPrompts) {
    //       setSavedPrompts([...defaultPrompts, ...data.savedPrompts]);
    //     } else {
    //       setSavedPrompts(defaultPrompts);
    //     }
    //   });
  }, []);

  // const handleLlmChoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
  //   const selectedChoice = event.target.value;
  //   setLlmChoice(selectedChoice);
  //   chrome.storage.sync.set({ llmChoice: selectedChoice });
  // };

  // const handleCustomPromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
  //   setCustomPrompt(event.target.value);
  // };

  // const handleLoadPromptChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
  //   const selectedPrompt = savedPrompts.find((prompt) => prompt.name === event.target.value);
  //   if (selectedPrompt) {
  //     setCustomPrompt(selectedPrompt.text);
  //     chrome.storage.sync.set({ selectedPrompt });
  //   }
  // };

  // const handleSavePrompt = (event: React.FormEvent<HTMLFormElement>) => {
  //   event.preventDefault();
  //   const newPromptName = event.currentTarget.newPromptName.value;
  //   if (customPrompt && newPromptName) {
  //     const newPrompt: Prompt = { name: newPromptName, text: customPrompt };
  //     chrome.storage.sync.get(['savedPrompts'], (data: { savedPrompts?: Prompt[] }) => {
  //       const updatedPrompts = [...(data.savedPrompts || []), newPrompt];
  //       chrome.storage.sync.set({ savedPrompts: updatedPrompts }, () => {
  //         alert('Prompt saved!');
  //         setSavedPrompts([...savedPrompts, newPrompt]);
  //       });
  //     });
  //   }
  // };

  // const handleDeletePrompt = () => {
  //   const selectedPrompt = savedPrompts.find((prompt) => prompt.text === customPrompt);
  //   if (selectedPrompt) {
  //     chrome.storage.sync.get(['savedPrompts'], (data: { savedPrompts?: Prompt[] }) => {
  //       const updatedPrompts = (data.savedPrompts || []).filter((prompt) => prompt.name !== selectedPrompt.name);
  //       chrome.storage.sync.set({ savedPrompts: updatedPrompts }, () => {
  //         alert('Prompt deleted!');
  //         setCustomPrompt('');
  //         setSavedPrompts(updatedPrompts);
  //       });
  //     });
  //   }
  // };

  const handleApiKeySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newApiKey = event.currentTarget.apiKey.value;
    const apiKeySavedAt = new Date().toLocaleString();
    chrome.storage.sync.set({ apiKey: newApiKey, apiKeySavedAt }, () => {
      alert('API Key saved!');
      setSavedKeyDisplay(newApiKey);
      setSavedTimeDisplay(apiKeySavedAt);
    });
  };

  const handleClearApiKey = () => {
    if (confirm('Are you sure you want to remove the API Key?')) {
      chrome.storage.sync.remove(['apiKey', 'savedAt'], () => {
        setApiKey('');
        setSavedKeyDisplay('None');
        setSavedTimeDisplay('Never');
      });
    }
  };

  // const handleClearCache = () => {
  //   if (confirm('Are you sure you want to clear the cache?')) {
  //     alert('jk, lol: Cache clearing is disabled in this version.');
  //   }
  // };

  // const handleClearDatabase = () => {
  //   if (confirm('Are you sure you want to clear the database?')) {
  //     alert('jk, lol: Database clearing is disabled in this version.');
  //   }
  // };


  return (
    <div className="container">
      <h1>Extension Options</h1>
      <p>Customize your extension settings here.</p>
      {/* <div id="llmChoice">
        <h2>LLM Options</h2>
        <label htmlFor="llmChoice">LLM Choice:</label>
        <div>
          <select id="llmChoice" name="llmChoice">
            <option value="haiku">Claude Haiku</option>
          </select>
        </div>
        <div>
          <label htmlFor="customPrompt">Custom Prompt:</label>
          <br />
          <textarea
            id="customPromptTextArea"
            name="customPrompt"
            rows={20}
            cols={75}
            maxLength={2000}
            defaultValue="defaultvalue"
          ></textarea>
        </div>
        <div>
          <select id="loadPrompt" name="loadPrompt"></select>
        </div>
        <div>
          <form id="savePromptForm">
            <label htmlFor="newPromptName">New Prompt Name:</label>
            <input type="text" id="newPromptName" name="newPromptName" />
            <button type="submit" id="savePromptBtn">
              Save
            </button>
          </form>
        </div>

        <button id="resetPromptBtn">Reset to saved</button>
        <button id="deletePromptBtn">Delete custom prompt</button>
      </div> */}
      <div id="apiKeyForm">
        <h2>API Key</h2>
        <form id="optionsForm" onSubmit={handleApiKeySubmit}>
          <label htmlFor="apiKey">API Key:</label>
          <input type="text" id="apiKey" name="apiKey" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          <button type="submit">Save</button>
        </form>
        <p id="savedKey">Current saved key: {savedKeyDisplay}</p>
        <p id="savedTime">Last saved at: {savedTimeDisplay}</p>
        <button id="clearBtn" onClick={handleClearApiKey}>
          Clear
        </button>
      </div>
      {/* <div id="dataManagement">
        <h2>Cache and Database Management</h2>
        <div id="cacheContent">
          <h3>Cache Content:</h3>
          <p id="cacheContentList"></p>
          <p id="cacheStatus"></p>
          <button id="clearCacheBtn">Clear Cache</button>
          <p id="cacheMessage"></p>
        </div>
        <div id="databaseContent">
          <h3>Database Content:</h3>
          <p id="databaseSize"></p>
          <button id="clearDatabaseBtn">Clear Database</button>
          <p id="databaseMessage"></p>
        </div>
      </div> */}
    </div>
  );
};

export default Options;

