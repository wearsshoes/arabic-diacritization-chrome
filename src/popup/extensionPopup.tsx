import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client'

import { Prompt } from '../common/types';

import theme from '../assets/theme';
import Fonts from '../assets/fonts';
import { ChakraProvider } from '@chakra-ui/react'
import {
  SimpleGrid,
  Button,
  Card,
  Heading,
  HStack,
  Select,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionIcon,
  AccordionPanel,
  VStack,
  Center,
  Text
} from '@chakra-ui/react';

const App: React.FC = () => {

  const [pageLanguage, setPageLanguage] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [promptLength, setPromptLength] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [outputTokenCount, setOutputTokenCount] = useState(0);
  const [model, setModel] = useState('');
  const [costEstimate, setCostEstimate] = useState('');
  const [diacritizeStatus, setDiacritizeStatus] = useState('');
  const [savedInfo, setSavedInfo] = useState('');
  const [loadState, setLoadState] = useState(false);
  const [method, setMethod] = useState('fullDiacritics');

  useEffect(() => {
    // Check API key
    // TODO: just get it from the background worker instead
    (async () => {
      const apiKey: string = await chrome.runtime.sendMessage({ action: 'getAPIKey' });
      if (!apiKey) {
        const button = document.createElement('Button');
        button.textContent = 'Please set your API key in the options page.';
        document.getElementById('main')?.replaceChildren(button);
        button.addEventListener('click', () => chrome.runtime.openOptionsPage());
      }

      // Update model display
      setModel('Claude Haiku');
      setLoadState(true);
    })();

  }, []);

  useEffect(() => {
    if (loadState) {
      getWebsiteData();
      getSelectedPrompt();
      getSavedInfo();
      setLoadState(false);
    }
  });

  useEffect(() => {
    calculateCost();
  }, [outputTokenCount, characterCount, promptLength]);

  const getWebsiteData = async () => {
    interface WebsiteData {
      characterCount: number;
      language: string;
    }
    chrome.runtime.sendMessage({ action: 'getWebsiteData' }, (response: WebsiteData) => {
      if (response.language) {
        const languageNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'language' });
        const languageNamesInArabic = new Intl.DisplayNames(['ar'], { type: 'language' });
        const lang = languageNamesInEnglish.of(response.language) || 'unknown';
        const lang_ar = languageNamesInArabic.of(response.language) || 'unknown';
        setPageLanguage(lang + ' (' + lang_ar + ')');
      };

      setCharacterCount(response.characterCount);
      setOutputTokenCount(response.characterCount * 2.3);
    });
  };

  const getSelectedPrompt = () => {
    chrome.storage.sync.get(['selectedPrompt'], (data: { selectedPrompt?: Prompt }) => {
      if (data.selectedPrompt) {
        setSelectedPrompt(data.selectedPrompt.name);
        chrome.runtime.sendMessage(
          { action: 'getSystemPromptLength', prompt: data.selectedPrompt.text },
          (response) => {
            if (response) {
              setPromptLength(response);
            }
          });
      }
    });
  };

  const getSavedInfo = () => {
    chrome.runtime.sendMessage({ action: 'getSavedInfo' }, (response) => {
      // set saved info to all the methods for which there are saved diacritizations
      console.log('Saved info:', response);
      const savedInfo = response.join(', ');
      if (savedInfo === '') {
        setSavedInfo('No saved diacritizations.');
      } else {
        setSavedInfo('Existing diacritizations: ' + savedInfo);
      }
    });
  }

  const beginDiacritization = async () => {
    try {
      setDiacritizeStatus('Diacritizing, see progress bar modal...');
      const response = await chrome.runtime.sendMessage({ action: 'sendToDiacritize', method });
      console.log(`${method} response:`, response);
      setDiacritizeStatus('Diacritization complete, page updated.');
    } catch (error) {
      console.error(`Error in ${method}:`, error);
      setDiacritizeStatus('Error diacritizing:' + error);
    }
  };

  const calculateCost = () => {
    if (outputTokenCount && characterCount && promptLength) {
      const costEstimate = calculateCostEstimate();
      const costInDollars = costEstimate.toFixed(2);
      setCostEstimate(`Estimated cost: $${costInDollars}`);
    } else {
      setCostEstimate('Estimated cost: Unknown');
    }
  };

  const calculateCostEstimate = (): number => {
    const inputCost = 0.25 / 1000000;
    const batchLength = 750;
    const batches = Math.ceil(characterCount / batchLength);
    const inputSubtotal = ((promptLength * batches) + characterCount) * inputCost;
    const outputCost = 1.25 / 1000000;
    const outputSubtotal = characterCount * 2.3 * outputCost;
    const totalCostPlusTax = (inputSubtotal + outputSubtotal) * 1.1;
    return totalCostPlusTax;
  };

  const clearSaved = () => {
    setSavedInfo('clearing cache info for page');
    chrome.runtime.sendMessage({ action: 'clearWebPageData' }, (response) => {
      if (response.message) {
        console.log('Cleared saved data:', response);
        setSavedInfo('Cleared saved data.');
        setLoadState(true);
      } else {
        console.error('Failed to clear saved data:', response);
        setSavedInfo('Failed to clear saved data.');
      }
    });
  };

  return (
    <Card bg='#c2a25d' padding='2' w='360px'>
      <VStack spacing={2} align="start">

        <Card bg='#fbeed7' padding='2' width='100%'>
          <Center>
            <VStack>
              <Heading fontFamily={'basmala'} padding={2} marginTop={5} marginBottom={0} lineHeight={0}>ArabEasy</Heading>
              <Text fontFamily={'arabic'} fontSize='xl' fontWeight={900} marginBottom={5} lineHeight={1}>بتِحكي عَرَبِيْزِي؟</Text>
            </VStack>
          </Center>
          <Card padding='2'>
            <Text>This extension adds diacritics (taškīl) to Arabic text via Claude Haiku. Remember to add your Anthropic API Key on the options page.</Text>
            <Button size='xs' onClick={() => chrome.runtime.openOptionsPage()}>Open Options Page</Button>
          </Card>
        </Card>

        <Card bg='#fbeed7' width={'100%'}>
          <Accordion allowToggle>
            <AccordionItem width='100%'>
              <AccordionButton justifyContent="center">
                <Heading size='md'>Page information</Heading>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel padding='2'>
                <SimpleGrid columns={2} spacing={2} marginBottom={2}>
                  <Card>
                    <Text fontWeight={'bold'}>Page language: </Text>
                    <Text>{pageLanguage}</Text>
                  </Card>
                  <Card>
                    <Text fontWeight={'bold'}>Active prompt: </Text>
                    <Text>"{selectedPrompt}"</Text>
                  </Card>
                  <Card>
                    <Text fontWeight={'bold'}>Prompt length: </Text>
                    <Text>{promptLength} tokens</Text>
                  </Card>
                  <Card>
                    <Text fontWeight={'bold'}>Characters on page: </Text>
                    <Text>{characterCount || 'NaN'}</Text>
                  </Card>
                  <Card>
                    <Text fontWeight={'bold'}>Estimated output: </Text>
                    <Text>{outputTokenCount.toFixed(0) || 'NaN'} tokens</Text>
                  </Card>
                  <Card>
                    <Text fontWeight={'bold'}>Model used: </Text>
                    <Text>{model}</Text>
                  </Card>
                </SimpleGrid>
                <Card>
                  <HStack>
                    <Text fontWeight={'bold'}>Estimated cost:</Text>
                  </HStack>
                  <Text>{costEstimate}</Text>
                </Card>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </Card>

        <Card bg='#fbeed7' width='100%' padding='2'>
          <Center>
            <Heading size='md' marginBottom={2}>Cache Info</Heading>
          </Center>
          <Card padding='2'>
            <Text>{savedInfo}</Text>
            <Button size='sm' onClick={() => clearSaved()}>Clear Saved Data</Button>
          </Card>
        </Card>

        <Card bg='#fbeed7' width='100%' padding='2'>
          <Center>
            <Heading size='md' marginBottom={2}>Task</Heading>
          </Center>
          <Card padding='2'>
            <HStack>
              <Select
                size='sm'
                id="diacritizationSelector"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value='fullDiacritics'>Full Diacritization</option>
                <option value="arabizi">Arabizi</option>
              </Select>
              <Button size='sm' onClick={beginDiacritization}>Start</Button>
            </HStack>
            <Text>{diacritizeStatus}</Text>
          </Card>
        </Card>

      </VStack>
    </Card>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <Fonts />
      <App />
    </ChakraProvider>
  </React.StrictMode>,
)