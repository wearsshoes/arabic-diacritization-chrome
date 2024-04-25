import React, { useEffect, useState } from 'react';

const APIKeyForm: React.FC = () => {

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
  });

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

  return (
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
  );
};

export default APIKeyForm;