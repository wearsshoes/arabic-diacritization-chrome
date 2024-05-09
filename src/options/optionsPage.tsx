import React from 'react';
import ReactDOM from 'react-dom/client';

import LLMOptions from './llmOptions';
import APIKeyForm from './apiKeyForm';
import DataManagement from './dataManagement';

import { ChakraProvider } from '@chakra-ui/react'

import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Box
} from '@chakra-ui/react'

/* eslint-disable react-refresh/only-export-components */
const Options: React.FC = () => {
  return (
    <Box width='60%' margin='auto' paddingTop={'50px'}>
      <Accordion allowToggle>
        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box as='span' flex='1' textAlign='left'>
                LLM Options
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <LLMOptions />
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box as='span' flex='1' textAlign='left'>
                API Key
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <APIKeyForm />
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box as='span' flex='1' textAlign='left'>
                Data Management
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <DataManagement />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Box>
  );
};

ReactDOM.createRoot(document.getElementById('options-root')!).render(
  <React.StrictMode>
    <ChakraProvider>
      <Options />
    </ChakraProvider>
  </React.StrictMode>,
)