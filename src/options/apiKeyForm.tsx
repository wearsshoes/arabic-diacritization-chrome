import React, { useEffect, useState } from 'react';
import { Box, FormControl, Card, Grid, GridItem, Text, Input, Heading, Button, VStack } from '@chakra-ui/react'

const APIKeyForm: React.FC = () => {

  const [apiKey, setApiKey] = useState('');
  const [savedKeyDisplay, setSavedKeyDisplay] = useState('');
  const [savedTimeDisplay, setSavedTimeDisplay] = useState('');

  useEffect(() => {
    // Load the API key
    // TODO: have background worker handle this, so it's all in one place
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
    <Box id="apiKeyForm" maxW='lg'>
      <VStack spacing='5'>
        <Heading size='lg'>API Key</Heading>
        <Card padding='5'>
        <FormControl id="optionsForm">
          <Grid templateColumns='repeat(5, 1fr)' gap={4}>
            <GridItem colSpan={4} w='100%'>
              <Input type="text" id="apiKey" name="apiKey" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            </GridItem>
            <GridItem colSpan={1} w='100%'>
              <Button id="saveBtn" onClick={handleApiKeySubmit}>Save</Button>
            </GridItem>
          </Grid>
        </FormControl>
        </Card>

        <Card width='100%' padding='5'>
          <Text fontWeight='bold'>Current saved key:</Text>
          <Text id="savedKey">{savedKeyDisplay}</Text>
          <Text fontWeight='bold'>Last saved at: </Text>
          <Text id="savedTime">{savedTimeDisplay}</Text>
          <Button id="clearBtn" onClick={handleClearApiKey}>Clear</Button>
        </Card>
      </VStack>
    </Box>
  );
};

export default APIKeyForm;