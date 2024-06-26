import React, { useEffect, useState } from 'react';
import {
  useToast,
  Stack,
  Text,
  Icon,
  Input,
  Button,
  IconButton,
  Switch,
  Divider,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Box,
  Wrap,
  Card,
  Select,
  Heading,
  Link,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  SimpleGrid,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  PopoverHeader,
  PopoverBody,
} from '@chakra-ui/react';

import { FiFeather, FiKey } from 'react-icons/fi';
import {
  CheckIcon, DeleteIcon, ExternalLinkIcon, SunIcon,
  QuestionOutlineIcon
} from '@chakra-ui/icons'

const GeneralOptions: React.FC = () => {
  const [optionsSaved, setOptionsSaved] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (optionsSaved) {
      toast.closeAll();
      toast({
        title: 'Changes Saved',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      console.log('Changes Saved');
      setOptionsSaved(false);
    }
  }, [optionsSaved, toast]);

  return (
    <Stack mt="4" id="general">
      <Stack pt="2" spacing={"4"}>
        <TransliterationMethod setOptionsSaved={setOptionsSaved} />
        <DiacritizeByDefault setOptionsSaved={setOptionsSaved} />
      </Stack>
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
      <Stack pt="2" spacing={{ base: 4, md: 6 }}>
        <ActiveModel setOptionsSaved={setOptionsSaved} />
        <EscalateModel setOptionsSaved={setOptionsSaved} />
        <MaxTries setOptionsSaved={setOptionsSaved} />
        <MaxChars setOptionsSaved={setOptionsSaved} />
        <MaxConcurrent setOptionsSaved={setOptionsSaved} />
        <WaitTime setOptionsSaved={setOptionsSaved} />
      </Stack>
    </Stack>
  )
}

interface OptionProps {
  setOptionsSaved: React.Dispatch<React.SetStateAction<boolean>>;
  optionsSaved?: boolean;
}

const TransliterationMethod: React.FC<OptionProps> = ({ setOptionsSaved }) => {
  const [transliterationMethod, setTransliterationMethod] = useState("off");

  useEffect(() => {
    chrome.storage.sync.get(['transliterationMethod'], (data: { transliterationMethod?: string }) => {
      setTransliterationMethod(data.transliterationMethod || "ala-lc-strict");
    });
  }, []);

  const handleToggle = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = event.target.value;
    setTransliterationMethod(newValue);
    chrome.storage.sync.set({ transliterationMethod: newValue }, () => { setOptionsSaved(true) });
  };

  return (
    <Box>
      <Wrap direction={{ base: "column", md: "row" }} align='center'>
        <Stack direction={'row'} flex={1} spacing={2} align={'center'}>
          <Text>
            Transliteration method to use
          </Text>
          <Popover>
            <PopoverTrigger>
              <IconButton
                aria-label="Help"
                icon={<QuestionOutlineIcon />}
                isRound
              />
            </PopoverTrigger>
            <PopoverContent w='fit-content' bg='gray.100'>
              <PopoverArrow bg='gray.100'/>
              <PopoverCloseButton />
              <PopoverHeader>Explanation</PopoverHeader>
              <PopoverBody >
                {/* <Text fontSize={'sm'}>
                  'ALA-LC Strict' is the more orthodox transliteration, which uses modified Latin characters and accent marks.
                  This version is very similar to Wikipedia.<br />
                </Text>
                <Text fontSize={'sm'}>
                  'Arabizi' is a more casual transliteration used in everyday life, based on normal Latin alphabet letters, using numbers to represent certain Arabic characters.
                  We use a Duolingo-flavored Arabizi that learners might be familiar with.<br />
                </Text> */}
                <Text>
                  <b>ALA-LC example: </b><i>al-ʿarabiyyahu l-fuṣḥā </i><br />
                  <b>Arabizi example: </b><i>3arabiyyah an-naas </i><br />
                </Text>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        </Stack>
        <Select
          id="autoDiacritizeSelect"
          value={transliterationMethod}
          onChange={handleToggle}
          minW="10rem"
          flex={0.5}
        >
          <option value="ala-lc-strict">ALA-LC Strict</option>
          <option value="duolingo-arabizi">Duolingo Arabizi</option>
        </Select>
      </Wrap>
    </Box>
  )
}

const DiacritizeByDefault: React.FC<OptionProps> = ({ setOptionsSaved }) => {
  const [autoDiacritize, setAutoDiacritize] = useState("off");

  useEffect(() => {
    chrome.storage.sync.get(['autoDiacritize'], (data: { autoDiacritize?: string }) => {
      setAutoDiacritize(data.autoDiacritize || "off");
    });
  }, []);

  const handleToggle = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = event.target.value;
    setAutoDiacritize(newValue);
    chrome.storage.sync.set({ autoDiacritize: newValue }, () => { setOptionsSaved(true) });
  };

  return (
    <Wrap direction={{ base: "column", md: "row" }} align='center'>
      <Stack spacing="0px" flex={1}>
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
      <Select
        id="autoDiacritizeSelect"
        value={autoDiacritize}
        onChange={handleToggle}
        minW="10rem"
        flex={0.3}
      >
        <option value="off">Off</option>
        <option value="fullDiacritics">Full Diacritics</option>
        <option value="arabizi">Transliteration</option>
      </Select>
    </Wrap>
  )
}


const APIKeyForm: React.FC<OptionProps> = ({ setOptionsSaved }) => {
  const [keyName, setKeyName] = useState('');
  const [apiKey, setApiKey] = useState('');

  const handleApiKeySubmit = async () => {
    const savedAt = new Date().toLocaleDateString();
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
      <Wrap
        direction={{ base: 'column', md: 'row' }}
        flex="1" spacing="2">
        <InputGroup flex={1} minW="8rem">
          <InputLeftElement>
            <Icon as={FiFeather}
              color={keyName.length === 20 ? 'red.300' : 'gray.300'}
            />
          </InputLeftElement>
          <Input
            placeholder="Key Name"
            type="text"
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
        <InputGroup flex={1.5} minW="12rem">
          <InputLeftElement>
            <Icon as={FiKey} color={'gray.300'} />
          </InputLeftElement>
          <Input
            placeholder="API Key"
            type="text"
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
      </Wrap>
      <Text fontStyle={'oblique'}> Your API key is stored locally (in plaintext), and only sent to Anthropic. </Text>
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

    if (activeKey === apiKeys[i].key && newKeys.length > 0) {
      chrome.storage.sync.set({ activeKey: newKeys[0].key });
      setActiveKey(newKeys[0].key);
    } else if (newKeys.length === 0) {
      chrome.storage.sync.remove('activeKey');
      setActiveKey('');
    }

    chrome.storage.sync.set({ apiKeys: newKeys });
    setApiKeys(newKeys);
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
    <SimpleGrid spacing={2} columns={{ base: 1, sm: 2, md: 1 }}>
      {apiKeys.map((apiKey, index) => (
        <Card p="2" key={index}>
          <Wrap
            spacing={{ base: 0, md: 4 }}
            direction={{ base: 'column', md: 'row' }}
            justify="space-between"
            align="center"
            overflow={'hidden'}
          >
            <Text fontWeight="bold" w={{ base: 'auto', md: '8rem' }}>
              {apiKey?.name || ''}
            </Text>
            <Text isTruncated flex={1}>
              {apiKey.key.slice(0, 12) + "..." + apiKey.key.slice(-5, apiKey.key.length) || ''}
            </Text>
            {activeKey === apiKey.key ? (
              <Text isTruncated fontWeight={'bold'} color="green">
                (Active)
              </Text>
            ) : (
              <Text color="gray.500">
                {apiKey.savedAt || ''}
              </Text>
            )}
            <Box>
              <IconButton
                id="setActiveBtn"
                size="sm"
                aria-label="Set as Active Key"
                icon={activeKey === apiKey.key ? <FiKey /> : <SunIcon />}
                colorScheme={activeKey === apiKey.key ? 'green' : 'blue'}
                isDisabled={activeKey === apiKey.key}
                onClick={() => handleSetActiveKey(index)}
              />
              <IconButton
                ml={2}
                id="clearBtn"
                size="sm"
                aria-label="Clear API Key"
                icon={<DeleteIcon />}
                colorScheme="red"
                onClick={() => handleClearApiKey(index)}
              />
            </Box>
          </Wrap>
        </Card>
      ))}
    </SimpleGrid>
  );
};


const ActiveModel: React.FC<OptionProps> = ({ setOptionsSaved }) => {
  const [activeModel, setActiveModel] = useState('haiku');

  useEffect(() => {
    chrome.storage.sync.get(['activeModel'], (data: { activeModel?: string }) => {
      setActiveModel(data.activeModel || 'haiku');
    });
  }, []);

  const handleActiveModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedChoice = event.target.value;
    setActiveModel(selectedChoice);
    chrome.storage.sync.set({ activeModel: selectedChoice }, () => { setOptionsSaved(true) });
  };

  return (
    <Wrap id="activeModel" align={'center'} direction={{ base: 'column', md: 'row' }}>
      <Stack direction={'column'} flex={1} spacing={0}>
        <Text >Default Model</Text>
        <Text fontSize={"md"} fontStyle={"oblique"}>
          Models are arranged in order of quality and cost.
        </Text>
      </Stack>
      <Select id="activeModel" name="activeModel" value={activeModel} onChange={handleActiveModelChange} w={"12rem"}>
        <option value="haiku">Claude Haiku</option>
        <option value="sonnet">Claude Sonnet</option>
        <option value="opus">Claude Opus</option>
      </Select>
    </Wrap>
  );
};

const EscalateModel: React.FC<OptionProps> = ({ setOptionsSaved }) => {
  const [escalateModel, setEscalateModel] = useState(false);

  useEffect(() => {
    chrome.storage.sync.get(['escalateModel'], (data: { escalateModel?: boolean }) => {
      setEscalateModel(data.escalateModel || false);
    });
  }, []);

  const handleEscalateModelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setEscalateModel(newValue);
    chrome.storage.sync.set({ escalateModel: newValue }, () => { setOptionsSaved(true) });
  };

  return (
    <Stack direction="row" align="center" spacing="3rem">
      <Text flex={1}>Escalate to next best model when result is awful (may cost more)</Text>
      <Switch size='lg' id="escalateSwitch" isChecked={escalateModel} onChange={handleEscalateModelChange} />
    </Stack>
  );
};

const MaxTries: React.FC<OptionProps> = ({ setOptionsSaved }) => {
  const [maxTries, setMaxTries] = useState(3);

  useEffect(() => {
    chrome.storage.sync.get(['maxTries'], (data: { maxTries?: number }) => {
      setMaxTries(data.maxTries || NaN);
    });
  }, []);

  const handleMaxTriesChange = (_: string, valueAsNumber: number) => {
    setMaxTries(valueAsNumber);
    chrome.storage.sync.set({ maxTries: valueAsNumber }, () => { setOptionsSaved(true) });
  };

  return (
    <Stack id="maxTries" direction={'row'} align="center" spacing="0px" flex="1">
      <Text flex={1}>Maximum times to try per batch</Text>
      <NumberInput maxWidth="24" h={'100%'} value={maxTries} min={1} max={10} onChange={handleMaxTriesChange}>
        <NumberInputField background="white" />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
    </Stack>
  );
};

const MaxChars: React.FC<OptionProps> = ({ setOptionsSaved }) => {
  const [maxChars, setMaxChars] = useState(750);

  useEffect(() => {
    chrome.storage.sync.get(['maxChars'], (data: { maxChars?: number }) => {
      setMaxChars(data.maxChars || NaN);
    });
  }, []);

  const handleMaxCharsChange = (_: string, valueAsNumber: number) => {
    setMaxChars(valueAsNumber);
    chrome.storage.sync.set({ maxChars: valueAsNumber }, () => { setOptionsSaved(true) });
  };

  return (
    <Stack direction={'row'} align='center'>
      <Stack justify="flex-start" align="flex-end" spacing="0px" flex="1">
        <Text alignSelf={"stretch"}>Query batch size (characters)</Text>
        <Text fontSize="sm" alignSelf={"stretch"}>
          Longer batches run slower but submit the prompt fewer times, so are cheaper.
        </Text>
      </Stack>
      <NumberInput maxWidth="24" h={"100%"} size="md" step={50} value={maxChars} min={100} max={4000} onChange={handleMaxCharsChange}>
        <NumberInputField background="white" />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
    </Stack>
  );
};

const MaxConcurrent: React.FC<OptionProps> = ({ setOptionsSaved }) => {
  const [maxConcurrent, setMaxConcurrent] = useState(3);

  useEffect(() => {
    chrome.storage.sync.get(['maxConcurrent'], (data: { maxConcurrent?: number }) => {
      setMaxConcurrent(data.maxConcurrent || NaN);
    });
  }, []);

  const handleMaxConcurrentChange = (_: string, valueAsNumber: number) => {
    setMaxConcurrent(valueAsNumber);
    chrome.storage.sync.set({ maxConcurrent: valueAsNumber }, () => { setOptionsSaved(true) });
  };

  return (
    <Stack id="maxConcurrent" direction={'row'} align="center" spacing="0px" flex="1">
      <Stack justify="flex-start" align="flex-end" spacing="0px" flex="1">
        <Text alignSelf={"stretch"}>Maximum number of concurrent batches (recommended: 3 or fewer)</Text>
        <Text fontSize="sm" alignSelf={"stretch"}>
          For more information on API backoff, see <Link isExternal href='https://docs.anthropic.com/en/api/rate-limits'>Anthropic API Rate Limits.<ExternalLinkIcon mx='2px' /></Link>
        </Text>
      </Stack>
      <NumberInput maxWidth="24" h={'100%'} value={maxConcurrent} min={1} max={100} onChange={handleMaxConcurrentChange}>
        <NumberInputField background="white" />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
    </Stack>
  );
};

const WaitTime: React.FC<OptionProps> = ({ setOptionsSaved }) => {
  const [waitTime, setWaitTime] = useState(3);

  useEffect(() => {
    chrome.storage.sync.get(['waitTime'], (data: { waitTime?: number }) => {
      setWaitTime(data.waitTime || NaN);
    });
  }, []);

  const handleWaitTimeChange = (_: string, valueAsNumber: number) => {
    setWaitTime(valueAsNumber);
    chrome.storage.sync.set({ waitTime: valueAsNumber }, () => { setOptionsSaved(true) });
  };

  return (
    <Stack id="waitTime" direction={'row'} align="center" spacing="0px" flex="1">
      <Stack justify="flex-start" align="flex-end" spacing="0px" flex="1">
        <Text alignSelf={"stretch"}>Wait time between job submissions (milliseconds)</Text>
        <Text fontSize="sm" alignSelf={"stretch"}>
          For more information on API backoff, see <Link isExternal href='https://docs.anthropic.com/en/api/rate-limits'>Anthropic API Rate Limits.<ExternalLinkIcon mx='2px' /></Link>
        </Text>
      </Stack>
      <NumberInput maxWidth="24" h={"100%"} size="md" step={100} value={waitTime} min={100} max={10000} onChange={handleWaitTimeChange}>
        <NumberInputField background="white" />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
    </Stack>
  );
};

export default GeneralOptions;