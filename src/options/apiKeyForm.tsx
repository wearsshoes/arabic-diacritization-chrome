import React, { useEffect, useState } from 'react';
import { Stack, Text, Input, Heading, Button } from '@chakra-ui/react'

const APIKeyForm: React.FC = () => {

  const [apiKey, setApiKey] = useState('');
  const [savedKeyDisplay, setSavedKeyDisplay] = useState('');
  const [savedTimeDisplay, setSavedTimeDisplay] = useState('');

  useEffect(() => {
    chrome.storage.sync.get(['apiKey', 'apiKeySavedAt'], (data: { apiKey?: string; apiKeySavedAt?: string }) => {
      setApiKey(data.apiKey || '');
      setSavedKeyDisplay(data.apiKey || 'None');
      setSavedTimeDisplay(data.apiKeySavedAt || 'Never');
    });
  }, []);

  const handleApiKeySubmit = () => {
    const apiKeySavedAt = new Date().toLocaleString();
    chrome.storage.sync.set({ apiKey: apiKey, apiKeySavedAt }, () => {
      alert('API Key saved!');
      setSavedKeyDisplay(apiKey);
      setSavedTimeDisplay(apiKeySavedAt);
    });
  };

  const handleClearApiKey = () => {
    if (confirm('Are you sure you want to remove the API Key?')) {
      chrome.storage.sync.remove(['apiKey', 'apiKeySavedAt'], () => {
        setApiKey('');
        setSavedKeyDisplay('None');
        setSavedTimeDisplay('Never');
      });
    }
  };

  return (
    <Stack direction='column' textAlign={'center'} id="apiKeyForm">
      <Heading size='sm'>API Key</Heading>
      <Stack direction='row'>
        <Input type="text" id="apiKey" name="apiKey" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
        <Button id="saveBtn" onClick={handleApiKeySubmit}>Save</Button>
        <Button id="clearBtn" onClick={handleClearApiKey}>Clear</Button>
      </Stack>
      <Text fontWeight='bold'>Current saved key:</Text>
      <Text id="savedKey">{savedKeyDisplay}</Text>
      <Text fontWeight='bold'>Last saved at: </Text>
      <Text id="savedTime">{savedTimeDisplay}</Text>
    </Stack>
  );
};

export default APIKeyForm;