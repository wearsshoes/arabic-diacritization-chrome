import React from 'react';
import { Center, Button } from '@chakra-ui/react'

const Options: React.FC = () => {

  const handleClearDatabase = () => {
    if (confirm('Are you sure you want to clear the database?')) {
      chrome.runtime.sendMessage({ action: 'clearDatabase' }, (response) => {
        if (response.message) {
          document.getElementById('databaseMessage')!.textContent = response.message;
        } else {
          document.getElementById('databaseMessage')!.textContent = 'Failed to clear database: no response from background script';
        }
      });
    }
  };

  return (
    <Center>
      <Button id="clearDatabaseBtn" onClick={handleClearDatabase}>
        Clear Database
      </Button>
      <p id="databaseMessage"></p>
    </Center>
  );
};

export default Options;