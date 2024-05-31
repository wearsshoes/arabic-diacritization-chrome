import React, { useEffect, useState } from 'react';
import { Stack, Text, Icon, Input, Button, Switch, Divider, InputGroup, InputLeftElement } from '@chakra-ui/react'
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

import { FiKey } from 'react-icons/fi';
import { CheckIcon, CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons'

const APIKeyForm: React.FC = () => {

  const [apiKey, setApiKey] = useState('');
  const [savedKeyDisplay, setSavedKeyDisplay] = useState('');
  const [savedTimeDisplay, setSavedTimeDisplay] = useState('');
  const [llmChoice, setLlmChoice] = useState('haiku');

  useEffect(() => {
    chrome.storage.sync.get(['apiKey', 'apiKeySavedAt'], (data: { apiKey?: string; apiKeySavedAt?: string }) => {
      setApiKey(data.apiKey || '');
      // setSavedKeyDisplay(data.apiKey?.slice(0, 12) + "..." + data.apiKey?.slice(-5, data.apiKey?.length) || 'None');
      setSavedKeyDisplay(data.apiKey || 'None');
      setSavedTimeDisplay(data.apiKeySavedAt || 'Never');
    });
    chrome.storage.sync.get(['llmChoice'], (data: { llmChoice?: string }) => {
      setLlmChoice(data.llmChoice || 'haiku');
    });
  }, []);

  const handleLlmChoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedChoice = event.target.value;
    setLlmChoice(selectedChoice);
    chrome.storage.sync.set({ llmChoice: selectedChoice });
  };

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

    <Stack mt="4" direction='column' id="general">
      <Heading >
        Anthropic API Key
      </Heading>
      <Divider />
      <Stack pt="2" spacing={"4"}>
        <Text>
          Easy Peasy Arabizi uses Claude for diacritization and transliteration.
          Claude is a large language model similar to ChatGPT, but better at
          language learning. You can get $5 in free credits on signing up, which is
          about 100 diacritized webpages. A video will soon be added with
          instructions.
        </Text>
        <Stack>
          <Text fontStyle={'oblique'}>
            Get your key from the <Link
              href='https://console.anthropic.com'>Anthropic Console <ExternalLinkIcon mb='4px' mx='2px' /> </Link>
          </Text>
          <Stack direction={'row'} flex="1" spacing="2">
            <InputGroup>
              <InputLeftElement>
                <Icon as={FiKey} color={'gray.300'} />
              </InputLeftElement>
              <Input
                placeholder="Placeholder"
                type="text"
                id="apiKey"
                name="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </InputGroup>
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
        </Stack>
      </Stack>
      <Heading >
        Model Options
      </Heading>
      <Divider />

      <Stack pt="2" spacing={"4"}>
        <Stack >
          <Heading size='md'>Model</Heading>
          <Text fontSize={"md"} fontStyle={"oblique"}>
            Models are arranged in order of quality and cost.{' '}
          </Text>
          <Select id="llmChoice" name="llmChoice" value={llmChoice} onChange={handleLlmChoiceChange}>
            <option value="haiku">Claude Haiku</option>
          </Select>
        </Stack>
        <Stack direction={'row'}>
          <Stack justify="flex-start" align="flex-end" spacing="0px" flex="1">
            <Text alignSelf={"stretch"}>
              Query batch size (characters)
            </Text>
            <Text fontSize="sm" alignSelf={"stretch"}>
              Longer batches run slower but submit the prompt fewer times, so are
              cheaper.
            </Text>
          </Stack>
          <NumberInput maxWidth="24" defaultValue="750">
            <NumberInputField background="#FFFFFF" />
            <NumberInputStepper background="white">
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </Stack>
        <Stack direction={'row'}>
          <Stack justify="flex-start" align="flex-end" spacing="0px" flex="1">
            <Text alignSelf={"stretch"}>
              Reject malformed responses
            </Text>
            <Text fontSize="sm" alignSelf={"stretch"}>
              E.g. when the LLM leaves out words. The diacritization may still be
              incorrect.
            </Text>
          </Stack>
          <Select placeholder="Always" width="160px" height="40px" />
        </Stack>
        <Stack direction={'row'} justify="flex-start" align="flex-end" spacing="0px" flex="1">
          <Text flex={1} alignSelf={'stretch'}>
            Maximum times to try per batch
          </Text>
          <NumberInput maxWidth="24" defaultValue="2">
            <NumberInputField background="#FFFFFF" />
            <NumberInputStepper background="white">
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </Stack>
        <Stack direction="row" justify="flex-start" align="flex-end" spacing="0px">
          <Text flex={1}>
            Escalate to next best model upon malformed response
          </Text>
          <Switch size="lg" id="escalateSwitch" />
        </Stack>
      </Stack>
    </Stack>
  )
}


export default APIKeyForm;