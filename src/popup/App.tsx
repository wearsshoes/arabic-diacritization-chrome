import React, { useEffect, useState } from 'react';
// import './App.css'
import { Prompt } from '../common/types';
import { getAPIKey } from '../common/utils';
import {
  SimpleGrid,
  Button,
  Card,
  Heading,
  HStack,
  Select,
  Text,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionIcon,
  AccordionPanel,
  VStack,
  Center
} from '@chakra-ui/react';

const App: React.FC = () => {

  const [pageLanguage, setPageLanguage] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [promptLength, setPromptLength] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [outputTokenCount, setOutputTokenCount] = useState(0);
  const [model, setModel] = useState('');
  const [costEstimate, setCostEstimate] = useState('');

  useEffect(() => {
    // Check API key
    const apiKey = getAPIKey()
    if (!apiKey) {
      const button = document.createElement('Button');
      button.textContent = 'Please set your API key in the options page.';
      document.getElementById('main')?.replaceChildren(button);
      button.addEventListener('click', () => chrome.runtime.openOptionsPage());
    }

    // Get website data
    getWebsiteData();

    // Get selected prompt
    getSelectedPrompt();

    // Update model display
    setModel('Claude Haiku');

  }, []);

  const getWebsiteData = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id === undefined) throw new Error('No active tab found');

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getWebsiteData' });
      setPageLanguage(response.language);
      setCharacterCount(response.characterCount);
      setOutputTokenCount(response.batches);
    } catch (error) {
      console.error('Failed to get complete website data:', error);
    }
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
          }
        );
      }
    });
  };

  const beginDiacritization = async (method: string) => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'sendToDiacritize', method });
      console.log(`${method} response:`, response);
    } catch (error) {
      console.error(`Error in ${method}:`, error);
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
    const inputSubtotal = (promptLength * outputTokenCount + characterCount) * inputCost;
    const outputCost = 1.25 / 1000000;
    const outputSubtotal = characterCount * 2.3 * outputCost;
    const totalCostPlusTax = (inputSubtotal + outputSubtotal) * 1.1;
    return totalCostPlusTax;
  };

  return (
    <Card bg='#c2a25d' padding='2' width='100%'>
      <VStack spacing={2} align="start">

        <Card bg='#fbeed7' padding='2' width='100%'>
          <Center>
            <Heading fontFamily={'basmala'} padding={2}>ArabEasy</Heading>
          </Center>
          <Card padding='2'>
            <Text>This extension adds full diacritics (tashkeel) to Arabic text via Claude Haiku. Remember to add your Anthropic API Key on the options page.</Text>
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
                    <Text>{promptLength}</Text>
                  </Card>
                  <Card>
                    <Text fontWeight={'bold'}>Characters on page: </Text>
                    <Text>{characterCount || 'NaN'}</Text>
                  </Card>
                  <Card>
                    <Text fontWeight={'bold'}>Estimated output: </Text>
                    <Text>{outputTokenCount || 'NaN'} tokens</Text>
                  </Card>
                  <Card>
                    <Text fontWeight={'bold'}>Model used: </Text>
                    <Text>{model}</Text>
                  </Card>
                </SimpleGrid>
                <Card>
                  <HStack>
                    <Text fontWeight={'bold'}>Estimated cost:</Text>
                    <Button size='xs' onClick={calculateCost}>Calculate</Button>
                  </HStack>
                  <Text>{costEstimate}</Text>
                </Card>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </Card>

        <Card bg='#fbeed7' width='100%' padding='2'>
          <Center>
            <Heading size='md' marginBottom={2}>Task</Heading>
          </Center>
          <Card padding='2'>
            <HStack>
              <Select size='sm' id="diacritizationSelector">
                <option value="diacritize">Full Diacritization</option>
                <option value="arabizi">Arabizi</option>
              </Select>
              <Button size='sm' onClick={() => beginDiacritization('diacritize')}>Start</Button>
            </HStack>
          </Card>
        </Card>

      </VStack>
    </Card>
  );
};

export default App;