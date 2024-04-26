import React, { useEffect, useState } from "react";
import { ChakraProvider } from '@chakra-ui/react';
import {
  Box,
  Card,
  Text,
  Progress,
  VStack,
  Heading,
  Flex,
  IconButton,
} from "@chakra-ui/react";
import { ChevronUpIcon, ChevronDownIcon } from "@chakra-ui/icons";

import theme from '../assets/theme';

const ContentOverlay: React.FC = () => {
  const [total, setTotal] = useState(0);
  const [finished, setFinished] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [isMinimized, setIsMinimized] = useState(true);

  useEffect(() => {

    const messageListener = (message: any, _sender: any, _sendResponse: (response?: any) => void) => {
      const { action, batches } = message;

      if (action === 'diacritizationBatchesStarted') {
        setTotal(batches);
        setFinished(0);
        setTimeElapsed(0);
        setIsMinimized(false);
        const id = setInterval(() => {
          setTimeElapsed((prevTime) => prevTime + 1);
        }, 1000);
        setIntervalId(id);
      } else if (action === 'diacritizationChunkFinished') {
        setFinished((prevFinished) => prevFinished + 1);
      } else if (action === 'updateWebsiteText') {
        setFinished(total);
        if (intervalId) {
          clearInterval(intervalId);
          setIntervalId(null);
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [total]);


  const progressPercent = total > 0 ? (finished / total) * 100 : 0;

  const handleMinimizeToggle = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <ChakraProvider theme={theme}>
      <Box position="fixed" bottom="24px" right="24px" style={{ direction: "ltr" }}>
        <Card bg="#fbeed7" p={isMinimized ? 2 : 6} borderRadius="lg" boxShadow="lg">
          {isMinimized ? (
            <IconButton
              aria-label="Maximize"
              icon={<ChevronUpIcon />}
              onClick={handleMinimizeToggle}
              size="sm"
              variant="ghost"
            />
          ) : (
            <>
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="md">Diacritizing</Heading>
                <IconButton
                  aria-label="Minimize"
                  icon={<ChevronDownIcon />}
                  onClick={handleMinimizeToggle}
                  size="sm"
                  variant="ghost"
                />
              </Flex>
              <VStack spacing={4} align="stretch">
                <Progress value={progressPercent} borderRadius="md" colorScheme="blue" />
                <Flex justify="space-between">
                  <Text>
                    Part {finished} of {total}
                  </Text>
                  <Text fontWeight="bold">{progressPercent.toFixed(0)}%</Text>
                </Flex>
                <Text fontSize="sm" color="gray.500">
                  Time elapsed: {timeElapsed}s
                </Text>
              </VStack>
            </>
          )}
        </Card>
      </Box>
    </ChakraProvider>
  );
};

export default ContentOverlay; 