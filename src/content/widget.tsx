import React, { useEffect, useState } from "react";
import { ChakraProvider, useDisclosure } from '@chakra-ui/react';
import { Stack, Container, Button, ButtonGroup, Text, IconButton, Progress } from '@chakra-ui/react'
import { SettingsIcon, ChevronUpIcon, CheckIcon, MinusIcon, CloseIcon, ArrowForwardIcon, SpinnerIcon } from '@chakra-ui/icons'
import { Languages, translations } from "./widget_i18n";
import { AppMessage, AppResponse } from "../common/types";

const ContentWidget: React.FC = () => {

  const { onOpen: onExpanded, isOpen: isExpanded, getDisclosureProps, getButtonProps } = useDisclosure({ defaultIsOpen: true })
  const { onOpen, onClose, onToggle, getDisclosureProps: getCloseItem } = useDisclosure({ defaultIsOpen: false })
  const buttonProps = getButtonProps()
  const disclosureProps = getDisclosureProps()
  const closeProps = getCloseItem()

  const [language, setLanguage] = useState<Languages>('en');

  const [method, setMethod] = useState('fullDiacritics');
  const [pageRenders, setPageRenders] = useState(['original']);
  const [pageState, setPageState] = useState('original');

  // const [diacritizeStatus, setDiacritizeStatus] = useState('');

  const [totalBatches, setTotalBatches] = useState(0);
  const [finishedBatches, setFinishedBatches] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const progressPercent = totalBatches > 0 ? (finishedBatches / totalBatches) * 100 : 0;

  const toggleLanguage = () => {
    setLanguage(prevLang => prevLang === 'en' ? 'ar' : 'en');
  };

  const cancelAction = async () => {
    const response = await chrome.runtime.sendMessage<AppMessage, AppResponse>({ action: 'cancelTask' });
    if (response.status === 'success') {
      setIsAnimating(false);
    } else {
      console.error('Error canceling:', response.error);
    }
  };

  useEffect(() => {
    chrome.runtime.sendMessage<AppMessage, AppResponse>({ action: 'widgetHandshake' });
    onOpen();
  }, [onOpen]);

  useEffect(() => {
    if (finishedBatches >= totalBatches && isAnimating) {
      setIsAnimating(false);
      setPageState(method);
      // setDiacritizeStatus('Page updated.');
    }
  }, [method, pageRenders, isAnimating, totalBatches, finishedBatches]);

  const taskChoiceHandler = (task: string) => {
    setMethod(task);
    console.log('selected task: ', task, 'current method: ', method, 'existing pageRenders:', pageRenders)
    if (pageRenders.includes(task)) {
      setPageState(task);
    }
  };

  const beginDiacritization = () => {
    try {
      // setDiacritizeStatus('Processing ...');
      chrome.runtime.sendMessage<AppMessage, AppResponse>({ action: 'processWebpage', method });
      // console.log(`${method} response:`, response);
    } catch (error) {
      // setDiacritizeStatus(`Error processing ${method}:` + error);
      console.error(`Error in ${method}:`, error);
    }
  };


  useEffect(() => {
    const listener =
      // TODO: merge these listeners back into contentUtils listeners
      (message: AppMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response: AppResponse) => void) => {
        const { action, batches } = message;
        switch (action) {
          case "diacritizationBatchesStarted": {
            if (batches) {
              setTotalBatches(batches);
              setFinishedBatches(0);
              setIsAnimating(true);
              onOpen();
              onExpanded();
              sendResponse({ status: 'success' });
            } else {
              sendResponse({ status: 'error', error: new Error('No batches provided') });
            }
            break;
          }
          case "diacritizationChunkFinished":
            setFinishedBatches((prevFinished) => prevFinished + 1);
            sendResponse({ status: 'success' });
            break;
          case "updateWebsiteText":
            setFinishedBatches(totalBatches);
            setPageRenders([method, ...pageRenders]);
            sendResponse({ status: 'success' });
            break;
          case "toggleWidget":
            onToggle();
            sendResponse({ status: 'success' });
            break;
        }
      }

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  });

  return (
    <ChakraProvider>
      <Container
        position="fixed"
        bottom="0"
        right="0"
        zIndex="9999"
        width="auto"
        style={{ direction: "ltr" }}
        {...closeProps}
      >
        <Stack
          id="widget"
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
                onClick={() => chrome.runtime.sendMessage<AppMessage, AppResponse>({ action: 'openOptionsPage' })}
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
              paddingLeft={isExpanded ? "0px" : "8px"}
              fontFamily="sans-serif"
              lineHeight="1.33"
              fontWeight="black"
              fontSize="12px"
              textTransform="uppercase"
              color="#000000"
              flex="1"
              textAlign="center"
            >
              {isExpanded ? translations.easyPeasyArabizi[language] : translations.arabizi[language]}
            </Text>
            <Stack direction="row" spacing="4px">
              <IconButton
                aria-label='Minimize'
                size="xs"
                variant="ghost"
                icon={isExpanded ? <MinusIcon /> : <ChevronUpIcon boxSize={6} />}
                {...buttonProps}
              />
              <IconButton
                aria-label='Close'
                onClick={onClose}
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
                  isDisabled={method === pageState || isAnimating}
                  onClick={() => beginDiacritization()}
                />
              </ButtonGroup>
                  <Text> DEBUG IS WORKING ALHAMDUILLAH. </Text>
                  <Text>pgst: {pageState.slice(0,5)} md: {method.slice(0,5)} anim:{isAnimating.toString()}</Text>
              {/* <Text fontSize={"12px"}>{diacritizeStatus}</Text> */}
            </Stack>
            <Stack direction={"row"} spacing={"0px"} width={"100%"}>
              <Progress
                value={progressPercent}
                colorScheme={isAnimating ? "blue" : "green"}
                hasStripe={isAnimating}
                isAnimated={isAnimating}
                size="xs"
                flex={1}
              />
              <IconButton
                aria-label="Close"
                size="xs"
                variant="ghost"
                icon={<CloseIcon />}
                onClick={cancelAction}
                visibility={isAnimating ? "visible" : "collapse"}
              />
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </ChakraProvider>
  );
};

export default ContentWidget;