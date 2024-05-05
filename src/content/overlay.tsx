import React, { useEffect, useState, useCallback } from "react";
import { ChakraProvider, useDisclosure } from '@chakra-ui/react';
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
  const { isOpen: isMinimized, onToggle: handleMinimizeToggle } = useDisclosure({ defaultIsOpen: true });
  const progressPercent = total > 0 ? (finished / total) * 100 : 0;

  const handleMessageListener = useCallback(
    (message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
      const { action, batches } = message;
      console.log("Overlay received message:", action);
      switch (action) {
        case "diacritizationBatchesStarted":
          setTotal(batches);
          setFinished(0);
          handleMinimizeToggle();
          sendResponse({ success: true });
          break;
          case "diacritizationChunkFinished":
          setFinished((prevFinished) => prevFinished + 1);
          sendResponse({ success: true });
          break;
        case "updateWebsiteText":
          setFinished(total);
          sendResponse({ success: true });
          break;
      }
    },
    [total, handleMinimizeToggle]
  );

  useEffect(() => {
    chrome.runtime.onMessage.addListener(handleMessageListener);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessageListener);
    };
  }, [handleMessageListener]);

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
              </VStack>
            </>
          )}
        </Card>
      </Box>
    </ChakraProvider>
  );
};

export default ContentOverlay; 