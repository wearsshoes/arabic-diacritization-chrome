import React, { useEffect, useState } from 'react';
import { useToast, Stack, Text, Icon, Input, Button, IconButton, Switch, Divider, InputGroup, InputLeftElement, InputRightElement } from '@chakra-ui/react'
import {
  Select,
  Heading,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Link,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,

} from '@chakra-ui/react'

import { FiFeather, FiKey } from 'react-icons/fi';
import { CheckIcon, DeleteIcon, ExternalLinkIcon } from '@chakra-ui/icons'

const GeneralOptions: React.FC = () => {
  const [optionsSaved, setOptionsSaved] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (optionsSaved) {
      toast({
        title: 'Changes Saved',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      console.log('Changes Saved');
      setOptionsSaved(false);
    }
  }, [toast, optionsSaved]);

  return (
    <Stack mt="4" id="general">
      <DiacritizeByDefault setOptionsSaved={setOptionsSaved} />
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
        <APIKeyForm setOptionsSaved={setOptionsSaved} />
        <Heading size='md'>Saved Keys: </Heading>
        <KeyList optionsSaved={optionsSaved} setOptionsSaved={setOptionsSaved} />
      </Stack>
      <Heading >
        Model Options
      </Heading>
      <Divider />
      <LLMOptions setOptionsSaved={setOptionsSaved}/>
    </Stack>
  )
}

interface OptionProps {
  setOptionsSaved: React.Dispatch<React.SetStateAction<boolean>>;
  optionsSaved?: boolean;
}

const DiacritizeByDefault: React.FC<OptionProps> = ({ setOptionsSaved }) => {
  const [autoDiacritize, setAutoDiacritize] = useState(false);

  useEffect(() => {
    chrome.storage.sync.get(['autoDiacritize'], (data: { autoDiacritize?: boolean }) => {
      setAutoDiacritize(data.autoDiacritize || false);
    });
  }, []);

  const handleToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setAutoDiacritize(newValue);
    chrome.storage.sync.set({ autoDiacritize: newValue }, () => { setOptionsSaved(true) });
  };

  return (
    <Stack direction={'row'}>
      <Stack spacing="0px" flex='1'>
        <Text alignSelf="stretch">
          Diacritize Arabic pages by default
        </Text>
        <Text
          fontSize="sm"
          alignSelf="stretch"
        >
          Warning: May get expensive! Track your stats in the usage tab.
        </Text>
      </Stack>
      <Switch
        size='lg'
        id="diacritizeSwitch"
        isChecked={autoDiacritize}
        onChange={handleToggle}
      />
    </Stack>
  )
}

const LLMOptions: React.FC<OptionProps> = ({ setOptionsSaved }) => {
  const [llmChoice, setLlmChoice] = useState('haiku');

  useEffect(() => {
    chrome.storage.sync.get(['llmChoice'], (data: { llmChoice?: string }) => {
      setLlmChoice(data.llmChoice || 'haiku');
    });
  }, []);

  const handleLlmChoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedChoice = event.target.value;
    setLlmChoice(selectedChoice);
    chrome.storage.sync.set({ llmChoice: selectedChoice }, () => { setOptionsSaved(true) });
  };

  return (
    <Stack pt="2" spacing={"4"}>
      <Stack >
        <Text fontWeight={'bold'}>Default Model</Text>
        <Text fontSize={"md"} fontStyle={"oblique"}>
          Models are arranged in order of quality and cost.{' '}
        </Text>
        <Select id="llmChoice" name="llmChoice" value={llmChoice} onChange={handleLlmChoiceChange}>
          <option value="haiku">Claude Haiku</option>
        </Select>
      </Stack>
      <Stack direction={'row'} id="rejectResponses">
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
      <Stack direction="row" justify="flex-start" align="flex-end" spacing="0px">
        <Text flex={1}>
          Escalate to next best model upon malformed response
        </Text>
        <Switch size='lg' id="escalateSwitch" />
      </Stack>
      <Stack id="maxTries"
        direction={'row'}
        justify="flex-start" align="flex-end" spacing="0px" flex="1">
        <Text flex={1} alignSelf={'stretch'}>
          Maximum times to try per batch
        </Text>
        <NumberInput maxWidth="24" h={'100%'} defaultValue="2">
          <NumberInputField background="white" />
          <NumberInputStepper >
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
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
        <NumberInput maxWidth="24" h={"100%"} size="md" step={50} defaultValue="750" min={0} max={4000}>
          <NumberInputField background="white" />
          <NumberInputStepper >
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </Stack>
    </Stack>
  )
}

const APIKeyForm: React.FC<OptionProps> = ({ setOptionsSaved }) => {
  const [keyName, setKeyName] = useState('');
  const [apiKey, setApiKey] = useState('');

  const handleApiKeySubmit = async () => {
    const savedAt = new Date().toLocaleString();
    chrome.storage.sync.get(['apiKeys'], (data) => {
      const keys = data.apiKeys || [];
      if (keyName.length > 0 && apiKey.length > 0) {
        keys.push({ name: keyName, key: apiKey, savedAt: savedAt });
        chrome.storage.sync.set({ apiKeys: keys }, () => {
          setOptionsSaved(true);
          setKeyName('');
          setApiKey('');
        });
      }
    });
  };

  return (
    <Stack>
      <Text fontStyle={'oblique'}>
        Get your key from the <Link
          href='https://console.anthropic.com'>Anthropic Console <ExternalLinkIcon mb='4px' mx='2px' /> </Link>
      </Text>
      <Stack direction={'row'} flex="1" spacing="2">
        <InputGroup flex={1}>
          <InputLeftElement>
            <Icon as={FiFeather}
              color={keyName.length === 20 ? 'red.300' : 'gray.300'}
            />
          </InputLeftElement>
          <Input
            placeholder="Name"
            type="text"
            id="keyName"
            name="keyName"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            maxLength={20}
          />
          <InputRightElement
            color={keyName.length === 20 ? 'red' : 'green'}
          >
            {20 - keyName.length}
          </InputRightElement>
        </InputGroup>
        <InputGroup flex={1.5}>
          <InputLeftElement>
            <Icon as={FiKey} color={'gray.300'} />
          </InputLeftElement>
          <Input
            placeholder="Api Key"
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
          isDisabled={!(keyName.length > 0 && apiKey.length > 0)}
        >
          Save
        </Button>
      </Stack>
    </Stack>
  )
}

const KeyList: React.FC<OptionProps> = ({ optionsSaved, setOptionsSaved }) => {

  const [apiKeys, setApiKeys] = useState<{ name: string, key: string, savedAt: string }[]>([]);
  const [activeKey, setActiveKey] = useState('');

  const handleSetActiveKey = (index: number) => {
    console.log('Setting Active Key', index);
    chrome.storage.sync.set({ activeKey: apiKeys[index].key });
    setActiveKey(apiKeys[index].key)
    setOptionsSaved(true);
  };

  const handleClearApiKey = (i: number) => {
    console.log('Clearing API Key', i);
    const newKeys = apiKeys.filter((_, index) => index !== i);
    chrome.storage.sync.set({ apiKeys: newKeys });
    setOptionsSaved(true);
  };

  useEffect(() => {
    chrome.storage.sync.get(['activeKey'], (data) => {
      setActiveKey(data.activeKey || '');
    });
  }, []);

  useEffect(() => {
    const keys: { name: string, key: string, savedAt: string }[] = [];
    chrome.storage.sync.get(['apiKeys'], (data) => {
      keys.push(...data.apiKeys);
      setApiKeys(keys);
    });
  }, [optionsSaved, activeKey, apiKeys]);

  return (
    <Table size='sm'>
      <Thead fontWeight={'bold'}>
        <Tr>
          <Td>Name</Td>
          <Td>Key</Td>
          <Td>Saved At</Td>
          <Td></Td>
          <Td></Td>
        </Tr>
      </Thead>
      <Tbody>
        {apiKeys.map((apiKey, index: number) => (
          <Tr key={index} overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
            <Td id="keyName" fontWeight='bold' width={12}>
              {apiKey?.name || ''}
            </Td>
            <Td id="savedKey" >
              {apiKey.key.slice(0, 12) + "..." + apiKey.key.slice(-5, apiKey.key.length) || ''}
            </Td>
            <Td id="savedTime" color='gray.500' flex="1" >
              {apiKey.savedAt || ''}
            </Td>
            <Td>
              <Text color='green'
                display={activeKey === apiKey.key ? 'flex' : 'none'}
              >
                Active
              </Text>
            </Td>
            <Td>
              <IconButton
                id="setActiveBtn"
                size='xs'
                aria-label="Set as Active Key"
                icon={<FiKey />}
                colorScheme="blue"
                isDisabled={activeKey === apiKey.key}
                onClick={() => handleSetActiveKey(index)}
              />
              <IconButton
                mx={2}
                id="clearBtn"
                size='xs'
                aria-label="Clear API Key"
                onClick={() => handleClearApiKey(index)}
                icon={<DeleteIcon />}
                colorScheme="red"
              />
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  )
};

export default GeneralOptions;