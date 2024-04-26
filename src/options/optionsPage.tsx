import React from 'react';
import ReactDOM from 'react-dom/client';

import LLMOptions from './llmOptions';
import APIKeyForm from './apiKeyForm';
import DataManagement from './dataManagement';

import './optionsPage.css';
import { ChakraProvider } from '@chakra-ui/react'
import { Box, Grid, GridItem, Center, Container, Heading, Card} from '@chakra-ui/react'
import Fonts from '../assets/fonts'
import theme from '../assets/theme'

const Options: React.FC = () => {
  return (
    <Box padding={5} marginTop={{ base: 5, md: 10, xl: 20 }}>
      <Fonts />
      <Container>
        <Grid
          templateRows='repeat(6)'
          templateColumns='repeat(3)'
          gap={4}>
          <GridItem colSpan={3}>
            <Card bg='#fbeed7' padding='10'>
              <Center>
                <Heading variant='heading1'>ArabEasy Extension Options</Heading>
              </Center>
            </Card>
          </GridItem>
          <GridItem colSpan={2} rowSpan={5}>
            <Card bg='#fbeed7'>
              <LLMOptions />
            </Card>
          </GridItem>
          <GridItem rowSpan={3}>
            <Card bg='#fbeed7' padding='5'>
              <APIKeyForm />
            </Card>
          </GridItem>
          <GridItem rowSpan={2}>
            <Card bg='#fbeed7' padding='5'>
              <DataManagement />
            </Card>
          </GridItem>
        </Grid>
      </Container>
    </Box>
  );
};

ReactDOM.createRoot(document.getElementById('options-root')!).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <Fonts />
      <Options />
    </ChakraProvider>
  </React.StrictMode>,
)