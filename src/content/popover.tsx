import React, { useEffect, useState } from "react";
import { ChakraProvider, useDisclosure } from '@chakra-ui/react';
import { Stack, Container, Button, ButtonGroup, Text, IconButton, Progress } from '@chakra-ui/react'
import { SettingsIcon, ChevronUpIcon, CheckIcon, MinusIcon, CloseIcon, ArrowForwardIcon, SpinnerIcon } from '@chakra-ui/icons'
import { Languages, translations } from "./popover_i18n";

const ContentPopover: React.FC = () => {

  const { isOpen, getDisclosureProps, getButtonProps } = useDisclosure({ defaultIsOpen: true })
  const buttonProps = getButtonProps()
  const disclosureProps = getDisclosureProps()

  const [language, setLanguage] = useState<Languages>('en');

  const [method, setMethod] = useState('fullDiacritics');
  const [pageRenders, setPageRenders] = useState(['original']);
  const [pageState, setPageState] = useState('original');

  const [totalBatches, setTotalBatches] = useState(0);
  const [finishedBatches, setFinishedBatches] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const progressPercent = totalBatches > 0 ? (finishedBatches / totalBatches) * 100 : 0;

  const expandPopover = () => {
    disclosureProps.onOpen();
  };

  const toggleLanguage = () => {
    setLanguage(prevLang => prevLang === 'en' ? 'ar' : 'en');
  };

  useEffect(() => {
    if (isAnimating) {
      const interval = setInterval(() => {
        setFinishedBatches((finishedBatches) => {
          if (finishedBatches >= totalBatches) {
            clearInterval(interval);
            setIsAnimating(false);
            setPageRenders([method, ...pageRenders]);
            setPageState(method);
            return 100;
          }
          return finishedBatches + 1;
        });
      }, 100);

      return () => {
        clearInterval(interval);
      };
    }
  }, [isAnimating]);

  const taskChoiceHandler = (task: string) => {
    setMethod(task);
    console.log('existing pageRenders:', pageRenders)
    if (pageRenders.includes(task)) {
      setPageState(task);
    }
  };

  const beginDiacritization = () => {
    setFinishedBatches(0);
    setTotalBatches(10)
    setIsAnimating(true);

    // try {
    //   setDiacritizeStatus('Diacritizing, see progress bar modal...');
    //   const response = await chrome.runtime.sendMessage({ action: 'sendToDiacritize', method });
    //   console.log(`${method} response:`, response);
    //   setDiacritizeStatus('Diacritization complete, page updated.');
    // } catch (error) {
    //   console.error(`Error in ${method}:`, error);
    //   setDiacritizeStatus('Error diacritizing:' + error);
    // }
  };

  const listener =
    // TODO: merge these listeners back into contentUtils listeners
    (message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
      const { action, batches } = message;
      switch (action) {
        case "diacritizationBatchesStarted":
          setTotalBatches(batches);
          setFinishedBatches(0);
          expandPopover();
          sendResponse({ success: true });
          break;
        case "diacritizationChunkFinished":
          setFinishedBatches((prevFinished) => prevFinished + 1);
          sendResponse({ success: true });
          break;
        case "updateWebsiteText":
          setFinishedBatches(totalBatches);
          sendResponse({ success: true });
          break;
      }
    };

  useEffect(() => {
    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [listener]);

  return (
    <ChakraProvider>
      <Container
        position="fixed"
        bottom="0"
        right="0"
        zIndex="9999"
        width="auto"
        style={{ direction: "ltr" }}
      >
        <Stack
          id="popover"
          padding="4px"
          borderTopRadius="8px"
          justify="flex-start"
          align="center"
          spacing="4px"
          borderColor="#000000"
          borderStartWidth="1px"
          borderEndWidth="1px"
          borderTopWidth="1px"
          background="#FFFFFF"
        >
          <Stack
            id="header"
            direction="row"
            justify="flex-start"
            align="center"
            spacing="10px"
          >
            <Stack
              direction="row"
              spacing="4px"
              {...disclosureProps}
            >
              <IconButton
                aria-label="Open settings"
                size="xs"
                variant="ghost"
                icon={<SettingsIcon boxSize={4} />}
                onClick={() => chrome.runtime.sendMessage({ action: 'openOptionsPage' })}
              />
              <Button
                aria-label='Toggle Language'
                size="xs"
                width="24px"
                variant="solid"
                colorScheme="blackAlpha"
                onClick={toggleLanguage}
              >
                {language}
              </Button>
            </Stack>
            <Text
              paddingLeft={isOpen ? "0px" : "8px"}
              fontFamily="sans-serif"
              lineHeight="1.33"
              fontWeight="black"
              fontSize="12px"
              textTransform="uppercase"
              color="#000000"
              flex="1"
              textAlign="center"
            >
              {isOpen ? translations.easyPeasyArabizi[language] : translations.arabizi[language]}
            </Text>
            <Stack direction="row" spacing="4px">
              <IconButton
                aria-label='Minimize'
                size="xs"
                variant="ghost"
                icon={isOpen ? <MinusIcon /> : <ChevronUpIcon boxSize={6} />}
                {...buttonProps}
              />
              <IconButton
                aria-label='Close'
                size="xs"
                variant="ghost"
                icon={<CloseIcon />}
              />
            </Stack>
          </Stack>
          <Stack id="content" width="100%" paddingBottom={"4px"}>
            <Stack width="100%" spacing="0px" {...disclosureProps}>
              <ButtonGroup id="taskButtons"
                width={"100%"}
                isAttached
                size="xs"
                colorScheme="blue"
              >
                <Button
                  variant={method === 'original' ? 'solid' : 'outline'}
                  flex={1}
                  onClick={() => taskChoiceHandler('original')}
                >
                  {translations.original[language]}
                </Button>
                <Button
                  variant={method === 'fullDiacritics' ? 'solid' : 'outline'}
                  flex={1}
                  onClick={() => taskChoiceHandler('fullDiacritics')}
                >
                  {translations.tashkil[language]}
                </Button>
                <Button
                  variant={method === 'arabizi' ? 'solid' : 'outline'}
                  flex={1}
                  onClick={() => taskChoiceHandler('arabizi')}
                >
                  {translations.arabizi[language]}
                </Button>
                <IconButton
                  aria-label="Update website text"
                  icon={
                    (method === pageState) ? <CheckIcon /> :
                      (isAnimating ? <SpinnerIcon /> : <ArrowForwardIcon />)
                  }
                  colorScheme={method === pageState ? "teal" : "orange"}
                  disabled={method === pageState || isAnimating}
                  onClick={() => beginDiacritization()}
                />
              </ButtonGroup>
              {/* <Text fontSize={"12px"}>{diacritizeStatus}</Text> */}
            </Stack>
            <Progress
              width="100%"
              value={progressPercent}
              colorScheme={isAnimating ? "blue" : "green"}
              hasStripe={isAnimating}
              isAnimated={isAnimating}
              size="xs"
              alignSelf="stretch"
            />
          </Stack>
        </Stack>
      </Container>
    </ChakraProvider>
  );
};

export default ContentPopover; 