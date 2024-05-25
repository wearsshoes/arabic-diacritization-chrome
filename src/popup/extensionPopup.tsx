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
  const [contentLoaded, setContentLoaded] = useState(false);
  // const [apiKeyFound, setApiKeyFound] = useState(true);


  useEffect(() => {
    //   // Check API key
    //   (async () => {
    //     const response = await chrome.runtime.sendMessage<AppMessage, AppResponse>({ action: 'getAPIKey' });
    //     console.log('API key response:', response);
    //     if (response.key) {
    //       setApiKeyFound(true);
    //     } else {
    //       setApiKeyFound(false);
    //     }
    setLoadState(true);
    //   })();
  }, []);

  useEffect(() => {
    if (loadState) {
      getWebsiteData();
      getSelectedPrompt();
      getSavedDiacrititizations();
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
    chrome.runtime.sendMessage<AppMessage, AppResponse>({ action: 'getWebsiteData' }, (response) => {
      if (response.status === 'error') {
        console.error('Error getting website data:', response.error);
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
        setContentLoaded(true);
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
          { action: 'getSystemPromptLength', prompt: data.selectedPrompt.text },
          (response) => {
            if (response.status === 'success' && response.tokens) {
              setPromptLength(response.tokens);
            } else {
              console.error('Error getting prompt length:', response.error || 'tokens unknown');
              setPromptLength(0);
            }
          });
      }
    });
  };

  const getSavedDiacrititizations = () => {
    try {
      chrome.runtime.sendMessage<AppMessage, AppResponse>({ action: 'getSavedDiacritizations' }, (response) => {
        console.log('Saved info:', response);
        if (response.status === 'error') {
          throw new Error(`${response.error}`);
        } else
          if (response.savedInfo && response.savedInfo.length > 0) {
            const savedInfo = response.savedInfo.join(', ');
            setSavedInfo('Existing diacritizations: ' + savedInfo);
          } else {
            setSavedInfo('No saved diacritizations.');
          }
      });
    } catch (error) {
      console.error('Error getting saved info:', error);
      setSavedInfo('Error getting saved info.');
    }
  }

  const beginDiacritization = async () => {
    try {
      setDiacritizeStatus('Diacritizing, see progress bar modal...');
      const response = await chrome.runtime.sendMessage<AppMessage, AppResponse>({ action: 'processWebpage', method });
      console.log(`${method} response:`, response);
      setDiacritizeStatus('Diacritization complete, page updated.');
    } catch (error) {
      console.error(`Error in ${method}:`, error);
      setDiacritizeStatus('Error diacritizing:' + error);
    }
  };

  const clearSaved = () => {
    setSavedInfo('clearing cache info for page');
    chrome.runtime.sendMessage<AppMessage, AppResponse>({ action: 'clearWebpageData' }, (response) => {
      if (response.status === 'success') {
        setSavedInfo('Cleared saved data.');
        setLoadState(false);
      } else {
        console.error('Failed to clear saved data:', response.error);
        setSavedInfo('Failed to clear saved data.');
      }
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
                <Text>{contentLoaded ? 'Success' : 'Loading...'}</Text>
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