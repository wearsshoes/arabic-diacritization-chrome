import { useEffect, useState } from "react";
import { useToast, useDisclosure } from '@chakra-ui/react';
import { Stack, Container, Button, ButtonGroup, Text, IconButton, Progress } from '@chakra-ui/react'
import { SettingsIcon, ChevronUpIcon, CheckIcon, MinusIcon, CloseIcon, ArrowForwardIcon, SpinnerIcon } from '@chakra-ui/icons'
import { Languages, translations } from "./widget_i18n";
import { AppMessage, AppResponse } from "../common/types";
import { WebpageDiacritizationData } from "../common/webpageDataClass";

function useCustomEvent(
  eventName: string,
  handler: (event: CustomEvent<{ strLength?: number, userMessage?: string }>) => void
) {
  useEffect(() => {
    document.addEventListener(eventName, handler as EventListener);
    return () => {
      document.removeEventListener(eventName, handler as EventListener);
    };
  }, [eventName, handler]);
}

const ContentWidget = ({ siteLanguage }: { siteLanguage: string }) => {

  const { onOpen, onClose, onToggle, getDisclosureProps: getCloseItem } = useDisclosure({ defaultIsOpen: true })
  const { onOpen: onExpand, onClose: onMinimize, isOpen: isExpanded, getDisclosureProps, getButtonProps } = useDisclosure({ defaultIsOpen: false })
  const buttonProps = getButtonProps()
  const disclosureProps = getDisclosureProps()
  const closeProps = getCloseItem()

  const [language, setLanguage] = useState<Languages>('en');
  const shouldDisplay = ['ar', 'arz'].includes(siteLanguage)
  const [textIsSelected, setTextIsSelected] = useState(false);

  const [method, setMethod] = useState('original');
  const [pageState, setPageState] = useState('original');
  const [pageRenders, setPageRenders] = useState(false);

  const [totalBatches, setTotal] = useState(0);
  const [finishedBatches, setProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const progressPercent = totalBatches > 0 ? (finishedBatches / totalBatches) * 100 : 0;

  const toast = useToast();

  const toggleLanguage = () => {
    setLanguage(prevLang => prevLang === 'en' ? 'ar' : 'en');
  };

  const cancelAction = async () => {
    const response = await chrome.runtime.sendMessage<AppMessage, AppResponse>({ action: 'cancelTask' });
    if (response.status === 'success') {
      setIsAnimating(false);
    } else {
      console.error('Error canceling:', response.errorMessage);
    }
  };

  useEffect(() => {
    chrome.storage.local.get(window.location.href, (result) => {
      const savedData: WebpageDiacritizationData = result[window.location.href];
      if (savedData) {
        setPageRenders(true)
      }
    })
  }, []);

  useEffect(() => {
    if (!shouldDisplay) onMinimize()
    else onExpand()
  }, [shouldDisplay, onMinimize, onExpand]);

  useEffect(() => {
    if (finishedBatches >= totalBatches && isAnimating) {
      setIsAnimating(false);
      console.log(`Finished updating webpage/selection with ${method}.`);
    }
  }, [method, pageRenders, isAnimating, totalBatches, finishedBatches, toast]);

  const taskChoiceHandler = (task: string) => {
    setMethod(task);
    console.log('selected task: ', task, 'current method: ', method, 'existing pageRenders:', pageRenders)
    if (pageRenders) {
      setPageState(task);
      // TODO: this should just ask the service worker to return the textNodes, then update the page according to method.
      //   chrome.runtime.sendMessage<AppMessage, AppResponse>({ action: 'processText', method: task, wholePage: true })
      //     .catch((error) => console.error(`Error in ${task}:`, error));
    }
  };

  const beginDiacritization = () => {
    console.log('Trying to start:', method)
    try {
      if (isAnimating) return;
      console.log('Processing:', method)
      if (textIsSelected) {
        chrome.runtime.sendMessage<AppMessage, AppResponse>({ action: 'processText', method, wholePage: false })
          .then((result) => {
            console.log('Selection processed:', result)
            if (result.status === 'success') {
              console.log('Selection processed:', result)
            } else {
              console.error('Error processing selection:', result.errorMessage)
            }
          });
      } else {
        chrome.runtime.sendMessage<AppMessage, AppResponse>({ action: 'processText', method, wholePage: true })
          .then((result) => {
            console.log('Webpage processed:', result)
            if (result.status === 'success') {
              console.log('Webpage processed:', result)
            } else {
              console.warn('Error processing webpage:', result.errorMessage)
            }
          });
      }
    } catch (error) {
      console.error(`Error in ${method}:`, error);
    }
  };

  useEffect(() => {
    if (isAnimating) {
      onOpen();
      onExpand();
    }
  }, [isAnimating, onOpen, onExpand]);

  useEffect(() => {
    document.addEventListener('selectionchange', () => {
      const selectedText = window.getSelection()?.toString().trim() ?? '';
      selectedText.length > 0 ? setTextIsSelected(true) : setTextIsSelected(false);
    });
  }, [textIsSelected]);

  useCustomEvent('beginProcessing', (event) => {
    setTotal(event.detail.strLength || 0);
    setProgress(0);
    setIsAnimating(true);
  });

  useCustomEvent('updateProgressBar', (event) => {
    setProgress((prevFinished) => prevFinished + (event.detail.strLength || 0));
  });

  useCustomEvent('webpageDone', () => {
    setProgress(totalBatches);
    setPageState(method);
    setPageRenders(true);
  });

  useCustomEvent('errorMessage', (event) => {
    const { userMessage } = event.detail;
    toast({
      title: 'Diacritization Error',
      description: `${userMessage}`,
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  });

  useCustomEvent('toggleWidget', () => {
    onToggle();
  });

  return (
    <Container
      position="fixed"
      bottom="0"
      right="0"
      zIndex="5000"
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
          width="100%"
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
              onClick={() => chrome.runtime.sendMessage<AppMessage, AppResponse>({ action: 'openOptions' })}
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
            {isExpanded ?
              (textIsSelected ?
                'Selection on Page' :
                translations.easyPeasyArabizi[language]) :
              translations.arabizi[language]}
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
        <Stack
          id="content"
          width="256px"
          spacing="0px"
          paddingBottom={"4px"}
          {...disclosureProps}
        >
          <ButtonGroup
            id="taskButtons"
            width={"100%"}
            isAttached
            size="xs"
            colorScheme="blue"
            display={isAnimating ? "none" : "flex"}
          >
            <Button
              variant={method === 'original' ? 'solid' : 'outline'}
              flex={1}
              onClick={() => taskChoiceHandler('original')}
              disabled={method === 'original'}
            >
              {translations.original[language]}
            </Button>
            <Button
              variant={method === 'fullDiacritics' ? 'solid' : 'outline'}
              flex={1}
              onClick={() => taskChoiceHandler('fullDiacritics')}
              disabled={method === 'fullDiacritics'}
            >
              {translations.tashkil[language]}
            </Button>
            <Button
              variant={method === 'arabizi' ? 'solid' : 'outline'}
              flex={1}
              onClick={() => taskChoiceHandler('arabizi')}
              disabled={method === 'arabizi'}
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
              isDisabled={method === pageState}
              onClick={() => beginDiacritization()}
            />
          </ButtonGroup>
          <ButtonGroup
            id="progressBar"
            width={"100%"}
            isAttached
            size="xs"
            colorScheme="blue"
            display={isAnimating ? "flex" : "none"}
          >
            <Button
              variant={"solid"}
              flex={1}
              size="xs"
              onClick={cancelAction}
              colorScheme="blue"
            >
              <Progress
                value={progressPercent}
                colorScheme="blue"
                hasStripe={isAnimating}
                isAnimated={isAnimating}
                flex={1}
              />
              <Text
                pos={"absolute"}
              >{finishedBatches}/{totalBatches}</Text>

            </Button>
            <IconButton
              aria-label="Cancel"
              icon={<CloseIcon />}
              colorScheme="red"
              onClick={cancelAction}
            />
          </ButtonGroup>
        </Stack>
      </Stack>
    </Container>
  );
};

export default ContentWidget;