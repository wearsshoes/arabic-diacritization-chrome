import React from 'react';
import { Box, Card, VStack, Heading, Button} from '@chakra-ui/react'

const Options: React.FC = () => {

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear the cache?')) {
      alert('jk, lol: Cache clearing is disabled in this version.');
    }
  };

  const handleClearDatabase = () => {
    if (confirm('Are you sure you want to clear the database?')) {
      alert('jk, lol: Database clearing is disabled in this version.');
    }
  };

  return (
    <Box id="dataManagement" maxW='lg'>
        <VStack spacing='5'>  
        <Heading size='lg'>Data Management</Heading>
        <Card width='100%' id="cacheContent" padding='5'>
          {/* <Heading size='sm'>Cache Content:</Heading>
          <p id="cacheContentList"></p>
          <p id="cacheStatus"></p> */}
          <Button id="clearCacheBtn" onClick={handleClearCache}>
            Clear Cache
          </Button>
          <p id="cacheMessage"></p>
        </Card>
        <Card width='100%' id="databaseContent" padding='5'>
          {/* <h3>Database Content:</h3>
          <p id="databaseSize"></p> */}
          <Button id="clearDatabaseBtn" onClick={handleClearDatabase}>
            Clear Database
          </Button>
          <p id="databaseMessage"></p>
        </Card>
        </VStack>
    </Box>
  );
};

export default Options;