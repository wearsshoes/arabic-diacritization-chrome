import React, { useEffect, useState } from 'react';
import './App.css'
import { Prompt } from '../common/types';
import { getAPIKey } from '../common/utils';

const App: React.FC = () => {

  const [pageLanguage, setPageLanguage] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [promptLength, setPromptLength] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [outputTokenCount, setOutputTokenCount] = useState(0);
  const [model, setModel] = useState('');
  const [costEstimate, setCostEstimate] = useState('');

  useEffect(() => {
    // Check API key
    const apiKey = getAPIKey()
    if (!apiKey) {
      const button = document.createElement('button');
      button.textContent = 'Please set your API key in the options page.';
      document.getElementById('main')?.replaceChildren(button);
      button.addEventListener('click', () => chrome.runtime.openOptionsPage());
    }

    // Get website data
    getWebsiteData();

    // Get selected prompt
    getSelectedPrompt();

    // Update model display
    setModel('Claude Haiku');

  }, []);

  const getWebsiteData = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id === undefined) throw new Error('No active tab found');

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getWebsiteData' });
      setPageLanguage(response.language);
      setCharacterCount(response.characterCount);
      setOutputTokenCount(response.batches);
    } catch (error) {
      console.error('Failed to get complete website data:', error);
    }
  };

  const getSelectedPrompt = () => {
    chrome.storage.sync.get(['selectedPrompt'], (data: { selectedPrompt?: Prompt }) => {
      if (data.selectedPrompt) {
        setSelectedPrompt(data.selectedPrompt.name);
        chrome.runtime.sendMessage(
          { action: 'getSystemPromptLength', prompt: data.selectedPrompt.text },
          (response) => {
            if (response) {
              setPromptLength(response);
            }
          }
        );
      }
    });
  };

  const beginDiacritization = async (method: string) => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'sendToDiacritize', method });
      console.log(`${method} response:`, response);
    } catch (error) {
      console.error(`Error in ${method}:`, error);
    }
  };

  const calculateCost = () => {
    if (outputTokenCount && characterCount && promptLength) {
      const costEstimate = calculateCostEstimate();
      const costInDollars = costEstimate.toFixed(2);
      setCostEstimate(`Estimated cost: $${costInDollars}`);
    } else {
      setCostEstimate('Estimated cost: Unknown');
    }
  };

  const calculateCostEstimate = (): number => {
    const inputCost = 0.25 / 1000000;
    const inputSubtotal = (promptLength * outputTokenCount + characterCount) * inputCost;
    const outputCost = 1.25 / 1000000;
    const outputSubtotal = characterCount * 2.3 * outputCost;
    const totalCostPlusTax = (inputSubtotal + outputSubtotal) * 1.1;
    return totalCostPlusTax;
  };

  return (
    <div>
      <p>This extension adds full diacritics (tashkeel) to Arabic text via Claude Haiku.</p>
      <p>Features:</p>
      <ul>
        <li>Diacritize Arabic text on any webpage</li>
        <li>Customizable diacritization options</li>
        <li>Fast and accurate diacritization powered by LLM</li>
      </ul>
      <div>
        <select id="diacritizationSelector">
          <option value="diacritize">Full Diacritization</option>
          <option value="arabizi">Arabizi</option>
        </select>
      </div>
      <div>
        {/* <p>{diacritizeMessage}</p> */}
        <button onClick={() => beginDiacritization('diacritize')}>Diacritize Page</button>
      </div>
      <div>
        <p>{ }</p>
        <button onClick={() => chrome.runtime.openOptionsPage()}>More options</button>
      </div>
      <h2>Page information</h2>
      <div>
        <p>Language: {pageLanguage}</p>
        <p>Task: {selectedPrompt}</p>
        <p>Prompt length: {promptLength}</p>
        <p>Character count: {characterCount}</p>
        <p>Estimated output token count: {outputTokenCount}</p>
        <p>Model: {model}</p>
        <p>
          {costEstimate}
          <button onClick={calculateCost}>Calculate</button>
        </p>
      </div>
    </div>
  );
};

export default App;