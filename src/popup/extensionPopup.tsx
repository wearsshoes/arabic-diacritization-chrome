import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client'
import { AppMessage, AppResponse, Prompt } from '../common/types';

// import theme from '../assets/theme';
import Fonts from '../assets/fonts';
import { ChakraProvider } from '@chakra-ui/react'
import {
  Button,
  Heading,
  Select,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionIcon,
  AccordionPanel,
  Stack,
  Text,
  Box
} from '@chakra-ui/react';

/* eslint-disable react-refresh/only-export-components */
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
  const [apiKeyFound, setApiKeyFound] = useState(false);


  useEffect(() => {
    chrome.storage.sync.get(['apiKey'], (data) => {
      if (data.apiKey) {
        setApiKeyFound(true);
        setLoadState(true);
      }
    });
  }, []);

  useEffect(() => {
    if (loadState) {
      getWebsiteData();
      getSelectedPrompt();
      getSavedDiacritizations();
      setModel('Claude Haiku');
    }
  }, [loadState]);

  useEffect(() => {
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

    calculateCost();
  }, [outputTokenCount, characterCount, promptLength]);

  const getWebsiteData = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;
    chrome.tabs.sendMessage<AppMessage, AppResponse>(tab.id, { action: 'getWebsiteData' }, (response) => {
      if (response.status === 'error') {
        console.error('Error getting website data:', response.errorMessage);
        return;
      }
      const { characterCount, language } = response;
      if (language) {
        const languageNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'language' });
        const languageNamesInArabic = new Intl.DisplayNames(['ar'], { type: 'language' });
        const lang = languageNamesInEnglish.of(language) || 'unknown';
        const lang_ar = languageNamesInArabic.of(language) || 'unknown';
        setPageLanguage(lang + ' (' + lang_ar + ')');
      }
      if (characterCount) {
        setCharacterCount(characterCount);
        setOutputTokenCount(characterCount * 2.3);
      }
    });
  };

  const getSelectedPrompt = () => {
    chrome.storage.sync.get(['selectedPrompt'], (data: { selectedPrompt?: Prompt }) => {
      if (data.selectedPrompt) {
        setSelectedPrompt(data.selectedPrompt.name);
        chrome.runtime.sendMessage<AppMessage, AppResponse>(
          { action: 'getSystemPromptLength' },
          (response) => {
            if (response.status === 'success') {
              setPromptLength(response?.tokenLength ?? 0);
            } else {
              console.error('Error getting prompt length:', response.errorMessage || 'tokens unknown');
              setPromptLength(0);
            }
          });
      }
    });
  };

  const getSavedDiacritizations = async () => {
    try {
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!currentTab || !currentTab.url) throw new Error('No active tab with URL found');

      const response = await chrome.storage.local.get(currentTab.url);
      const diacritizations = response[currentTab.url]?.diacritizations || {};
      const savedInfo = Object.keys(diacritizations).join(', ');

      setSavedInfo(savedInfo ? `Existing diacritizations: ${savedInfo}` : 'No saved diacritizations.');
    } catch (error) {
      console.error('Error:', error);
      setSavedInfo('Error getting saved diacritizations.');
    }
  }

  const beginDiacritization = async () => {
    try {
      setDiacritizeStatus('Diacritizing, see progress bar modal...');
      const response = await chrome.runtime.sendMessage<AppMessage, AppResponse>({ action: 'processText', method, wholePage: true });
      console.log(`${method} response:`, response);
      setDiacritizeStatus('Diacritization complete, page updated.');
    } catch (error) {
      console.error(`Error in ${method}:`, error);
      setDiacritizeStatus('Error diacritizing:' + error);
    }
  };

  const clearSaved = async () => {
    setSavedInfo('clearing cache info for page');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;
    await chrome.storage.local.remove(tab.url!)
      .then(() => {
        chrome.tabs.reload(tab.id!);
        setSavedInfo('Cleared saved data.');
        setLoadState(false);
      })
      .catch((error) => {
        console.error('Error clearing saved data:', error);
        setSavedInfo('Error clearing saved data.');
      });
  };

  return (
    <Box padding='2' w='360px'>
      <Stack spacing={2} align="auto">
        <Stack>
          <Heading fontFamily={'basmala'} padding={2} marginTop={5} marginBottom={0} textAlign='center' lineHeight={0}>Easy Peasy Arabizi</Heading>
          <Text fontSize={'md'} align={'center'}> This popup is still under construction. Recommend using the onscreen widget (Control-Shift-U / Command-Shift-U to restore if closed).</Text>
        </Stack>
        <Button size='xs' onClick={() => chrome.runtime.openOptionsPage()}>Open Options Page</Button>
        <Accordion alignContent={'center'} allowToggle>
          <AccordionItem width='100%'>
            <Heading size='md'>
              <AccordionButton>
                <Box as='span' flex='1' textAlign='left'>
                  Page Information
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </Heading>
            <AccordionPanel textAlign={'center'} padding='2'>
              <Stack direction='column' alignContent='auto'>
                <Text>{apiKeyFound ? 'Api Key Loaded' : 'API Key Not Found.'}</Text>
                <Text fontWeight={'bold'}>Page language: </Text>
                <Text>{pageLanguage}</Text>
                <Text fontWeight={'bold'}>Active prompt: </Text>
                <Text>"{selectedPrompt}"</Text>
                <Text fontWeight={'bold'}>Prompt length: </Text>
                <Text>{promptLength} tokens</Text>
                <Text fontWeight={'bold'}>Characters on page: </Text>
                <Text>{characterCount || 'NaN'}</Text>
                <Text fontWeight={'bold'}>Estimated output: </Text>
                <Text>{outputTokenCount.toFixed(0) || 'NaN'} tokens</Text>
                <Text fontWeight={'bold'}>Model used: </Text>
                <Text>{model}</Text>
                <Text fontWeight={'bold'}>Estimated cost:</Text>
                <Text>{costEstimate}</Text>
              </Stack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>

        <Heading size='md' marginBottom={2}>Cache Info</Heading>
        <Text>{savedInfo}</Text>
        <Button size='sm' onClick={() => clearSaved()}>Clear Saved Data</Button>

        <Heading size='md' marginBottom={2}>Task</Heading>
        <Stack>
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
        </Stack>
        <Text>{diacritizeStatus}</Text>

      </Stack>
    </Box >
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* <ChakraProvider theme={theme}> */}
    <ChakraProvider>
      <Fonts />
      <App />
    </ChakraProvider>
  </React.StrictMode>,
)