import React, { useEffect, useState } from 'react';
import { Text, Stack, Button, IconButton } from '@chakra-ui/react'
import { DeleteIcon } from '@chakra-ui/icons';
import {
  Stat,
  StatNumber,
  StatHelpText,
  StatArrow,
} from '@chakra-ui/react'

const DataManagement: React.FC = () => {

  const [saves, setSaves] = useState<{ url: string; bytes: number }[]>([]);
  const [storageUsed, setStorageUsed] = useState<number>(0);
  const [databaseMessage, setDatabaseMessage] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      chrome.storage.local.get(null, async (items) => {
        const saves = await Promise.all(
          Object.keys(items).map(async (key) => {
            return { url: key, bytes: await chrome.storage.local.getBytesInUse(key) };
          })
        );
        setSaves(saves);
      });
    };

    fetchData();
  }, [saves]);


  useEffect(() => {
    chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
      setStorageUsed(bytesInUse);
    });
  }, [storageUsed]);

  const handleClearDatabase = () => {
    if (confirm('Are you sure you want to clear the database?')) {
      try {
        chrome.storage.local.clear();
        setDatabaseMessage('Database cleared');
      } catch (error) {
        error instanceof Error
          ? setDatabaseMessage(`Failed to clear the database: ${error.message}`)
          : setDatabaseMessage(`Unknown error occurred, ${error}`);
      }
    }
  };


  return (
    <Stack>
      <Stack direction={"row"} alignItems={"baseline"}>
        <Stat>
          <Text color="gray.700">
            Pages cached
          </Text>
          <StatNumber>768.39</StatNumber>
          <StatHelpText>
            <StatArrow type="increase">
              <Stack id="arrow-up-s-fill" width="20px" height="20px" />
            </StatArrow>
              23.36%
          </StatHelpText>
        </Stat>
        <Stat>
          <Text color="gray.700">
            Storage used
          </Text>
          <StatNumber alignSelf="stretch">{(storageUsed / 10e5).toFixed(3)} mb</StatNumber>
          <StatHelpText>
            <StatArrow type="increase">
              <Stack id="arrow-up-s-fill" width="20px" height="20px" />
            </StatArrow>
              23.36%
          </StatHelpText>
        </Stat>
        <Button
          id="clearDatabaseBtn"
          size="sm"
          colorScheme="blue"
          onClick={handleClearDatabase}>
          Clear All
        </Button>
      </Stack>
      <Text id="databaseMessage">{databaseMessage}</Text>
      {saves.map((save, index) => (
        <Stack
          key={index}
          direction="row"
          alignItems={"center"}
          background={"gray.100"}
          padding={1}
          borderRadius={8}
          paddingLeft={2}
        >
          <Text flex={1}>{decodeURI(save.url)}</Text>
          <Text>{save.bytes / 1000} kb</Text>
          <IconButton
            aria-label="Delete"
            icon={<DeleteIcon />}
            size={"xs"}
            onClick={() => chrome.storage.local.remove(save.url)}
            colorScheme='red'
          />
        </Stack>
      ))}

    </Stack>
  )

};

export default DataManagement;