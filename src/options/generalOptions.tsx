import React, { useEffect, useState } from 'react';
import { Stack, Text, Input, Button, Switch } from '@chakra-ui/react'
import {
  Select,
  Heading,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Link
} from '@chakra-ui/react'
import { CheckIcon, CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons'

const APIKeyForm: React.FC = () => {

  const [apiKey, setApiKey] = useState('');
  const [savedKeyDisplay, setSavedKeyDisplay] = useState('');
  const [savedTimeDisplay, setSavedTimeDisplay] = useState('');

  useEffect(() => {
    chrome.storage.sync.get(['apiKey', 'apiKeySavedAt'], (data: { apiKey?: string; apiKeySavedAt?: string }) => {
      setApiKey(data.apiKey || '');
      // setSavedKeyDisplay(data.apiKey?.slice(0, 12) + "..." + data.apiKey?.slice(-5, data.apiKey?.length) || 'None');
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
    <Stack direction='column' id="apiKeyForm">
      <Text fontSize="md">
        Easy Peasy Arabizi uses Claude for diacritization and transliteration.
        Claude is a large language model similar to ChatGPT, but better at
        language learning. You can get $5 in free credits on signing up, which is
        about 100 diacritized webpages. A video will soon be added with
        instructions.
      </Text>
      <Heading size="lg">
        Anthropic API Key
      </Heading>
      <Text>
        Get your key from the <Link
          href='https://console.anthropic.com'>Anthropic Console<ExternalLinkIcon mx='2px' /></Link>
      </Text>
      <Stack direction={'row'} flex="1" spacing="2">
        <Input
          placeholder="Placeholder"
          type="text"
          id="apiKey"
          name="apiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <Button id="saveBtn"
          rightIcon={<CheckIcon data-icon="CkCheck" />}
          colorScheme="blue"
          onClick={handleApiKeySubmit}
        >
          Save
        </Button>
        <Button
          id="clearBtn"
          onClick={handleClearApiKey}
          rightIcon={<CloseIcon data-icon="CkClose" />}
          colorScheme="red"
        >
          Clear
        </Button>
      </Stack>
      <Stack direction='row'>
        <Text fontWeight='bold'>Current saved key: </Text>
        <Text id="savedKey" flex="1" overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">{savedKeyDisplay.slice(0, -10)}</Text>
        <Text id="savedTime" color='gray.500' >
          {savedTimeDisplay}
        </Text>
      </Stack>

      <Stack
        paddingY="10px"
        justify="flex-start"
        align="flex-start"
        spacing="10px"
        alignSelf="stretch"
      >
        <Stack
          justify="flex-start"
          align="flex-start"
          spacing="0px"
          alignSelf="stretch"
        >
          <Heading size="lg"
          >
            Claude Model
          </Heading>
          <Text
            lineHeight="1.33"
            fontWeight="regular"
            fontSize="12px"
            color="#000000"
            alignSelf="stretch"
          >
            In order of quality:{' '}
          </Text>
        </Stack>
        <Select
          placeholder="Haiku (2024-02-29)"
        />
      </Stack>
      <Stack
        paddingY="10px"
        alignSelf="stretch"
        direction="row"
        justify="flex-end"
        align="center"
        spacing="0px"
      >
        <Stack justify="flex-start" align="flex-end" spacing="0px" flex="1">
          <Text
            lineHeight="1.5"
            fontWeight="regular"
            fontSize="16px"
            color="#000000"
            alignSelf="stretch"
          >
            Query batch size (characters)
          </Text>
          <Text
            lineHeight="1.33"
            fontWeight="regular"
            fontSize="12px"
            color="#000000"
            alignSelf="stretch"
          >
            Longer batches run slower but submit the prompt fewer times, so are
            cheaper.
          </Text>
        </Stack>
        <NumberInput defaultValue="750">
          <NumberInputField background="#FFFFFF" />
          <NumberInputStepper background="white">
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </Stack>
      <Stack
        paddingY="10px"
        direction="row"
        justify="flex-end"
        align="center"
        spacing="0px"
        alignSelf="stretch"
      >
        <Stack justify="flex-start" align="flex-end" spacing="0px" flex="1">
          <Text
            lineHeight="1.5"
            fontWeight="regular"
            fontSize="16px"
            color="#000000"
            alignSelf="stretch"
          >
            Reject malformed responses
          </Text>
          <Text
            lineHeight="1.33"
            fontWeight="regular"
            fontSize="12px"
            color="#000000"
            alignSelf="stretch"
          >
            E.g. when the LLM leaves out words. The diacritization may still be
            incorrect.
          </Text>
        </Stack>
        <Select placeholder="Always" width="160px" height="40px" />
      </Stack>
      <Stack
        paddingY="10px"
        alignSelf="stretch"
        direction="row"
        justify="flex-end"
        align="center"
        spacing="0px"
      >
        <Stack justify="flex-start" align="flex-end" spacing="0px" flex="1">
          <Text
            lineHeight="1.5"
            fontWeight="regular"
            fontSize="16px"
            color="#000000"
            alignSelf="stretch"
          >
            Maximum times to try per batch
          </Text>
        </Stack>
        <NumberInput defaultValue="2">
          <NumberInputField background="#FFFFFF" />
          <NumberInputStepper background="white">
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </Stack>
      <Stack
        paddingY="10px"
        alignSelf="stretch"
        direction="row"
        justify="flex-end"
        align="center"
        spacing="0px"
      >
        <Stack direction="row" justify="flex-start" align="flex-end" spacing="0px" flex="1">
          <Text
            lineHeight="1.5"
            fontWeight="regular"
            fontSize="16px"
            color="#000000"
            alignSelf="stretch"
            flex={1}
          >
            Escalate to next best model upon malformed response
          </Text>
          <Switch id="escalateSwitch" />
        </Stack>
      </Stack>
    </Stack>
  )
}


export default APIKeyForm;