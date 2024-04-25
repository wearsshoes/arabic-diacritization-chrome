import React, { useEffect, useState } from 'react';
import defaultPrompts from '../../public/defaultPrompts.json';
import { Prompt } from '../common/types';

const LLMOptions: React.FC = () => {
  const [llmChoice, setLlmChoice] = useState('haiku');
  const [customPrompt, setCustomPrompt] = useState('');
  const [savedPrompts, setSavedPrompts] = useState<Prompt[]>([]);

  useEffect(() => {

    // Load LLM choice
    chrome.storage.sync.get(['llmChoice'], (data: { llmChoice?: string }) => {
      setLlmChoice(data.llmChoice || 'haiku');
    });

    // Load the last selected prompt
    chrome.storage.sync.get(['selectedPrompt'], (data: { selectedPrompt?: Prompt }) => {
      const selected = data.selectedPrompt?.name;
      setCustomPrompt(defaultPrompts[0].text || '');
      if (selected) {
        const selectedPrompt = defaultPrompts.find((prompt) => prompt.name === selected);
        if (selectedPrompt) {
          setCustomPrompt(selectedPrompt.text);
        }
      }
    });

    // Load saved prompts
    chrome.storage.sync.get(['savedPrompts'], (data: { savedPrompts?: Prompt[] }) => {
      if (data.savedPrompts) {
        setSavedPrompts([...defaultPrompts, ...data.savedPrompts]);
      } else {
        setSavedPrompts(defaultPrompts);
      }
    });
  }, []);

  const handleLlmChoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedChoice = event.target.value;
    setLlmChoice(selectedChoice);
    chrome.storage.sync.set({ llmChoice: selectedChoice });
  };

  const handleCustomPromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomPrompt(event.target.value);
  };

  const handleLoadPromptChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPrompt = savedPrompts.find((prompt) => prompt.name === event.target.value);
    if (selectedPrompt) {
      setCustomPrompt(selectedPrompt.text);
      chrome.storage.sync.set({ selectedPrompt });
    }
  };

  const handleSavePrompt = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newPromptName = event.currentTarget.newPromptName.value;
    if (customPrompt && newPromptName) {
      const newPrompt: Prompt = { name: newPromptName, text: customPrompt };
      chrome.storage.sync.get(['savedPrompts'], (data: { savedPrompts?: Prompt[] }) => {
        const updatedPrompts = [...(data.savedPrompts || []), newPrompt];
        chrome.storage.sync.set({ savedPrompts: updatedPrompts }, () => {
          alert('Prompt saved!');
          setSavedPrompts([...savedPrompts, newPrompt]);
        });
      });
    }
  };

  const handleDeletePrompt = () => {
    const selectedPrompt = savedPrompts.find((prompt) => prompt.text === customPrompt);
    if (selectedPrompt) {
      chrome.storage.sync.get(['savedPrompts'], (data: { savedPrompts?: Prompt[] }) => {
        const updatedPrompts = (data.savedPrompts || []).filter((prompt) => prompt.name !== selectedPrompt.name);
        chrome.storage.sync.set({ savedPrompts: updatedPrompts }, () => {
          alert('Prompt deleted!');
          setCustomPrompt('');
          setSavedPrompts(updatedPrompts);
        });
      });
    }
  };

  return (
    <div id="llmChoice">
      <h2>LLM Options</h2>
      <label htmlFor="llmChoice">LLM Choice:</label>
      <div>
        <select id="llmChoice" name="llmChoice" value={llmChoice} onChange={handleLlmChoiceChange}>
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
          value={customPrompt}
          onChange={handleCustomPromptChange}
        ></textarea>
      </div>
      <div>
        <select id="loadPrompt" name="loadPrompt" onChange={handleLoadPromptChange}>
          {savedPrompts.map((prompt) => (
            <option key={prompt.name} value={prompt.name}>
              {prompt.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <form id="savePromptForm" onSubmit={handleSavePrompt}>
          <label htmlFor="newPromptName">New Prompt Name:</label>
          <input type="text" id="newPromptName" name="newPromptName" />
          <button type="submit" id="savePromptBtn">
            Save
          </button>
        </form>
      </div>
      <button id="deletePromptBtn" onClick={handleDeletePrompt}>
        Delete custom prompt
      </button>
    </div>
  );
};

export default LLMOptions;