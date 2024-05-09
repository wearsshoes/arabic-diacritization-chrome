import React from 'react';
import { Center, Button } from '@chakra-ui/react'
import { AppMessage, AppResponse } from '../common/types';

const Options: React.FC = () => {

  const handleClearDatabase = () => {
    if (confirm('Are you sure you want to clear the database?')) {
      try {
        chrome.runtime.sendMessage<AppMessage, AppResponse>({ action: 'clearDatabase' }, (response) => {
          document.getElementById('databaseMessage')!.textContent = response.status;
        });
      } catch (error) {
        document.getElementById('databaseMessage')!.textContent = `Error clearing database: ${error}`;
      }
    }
  }

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