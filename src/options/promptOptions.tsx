import React, { useEffect, useState } from 'react';
import { AppMessage, AppResponse } from '../common/types';
import { Prompt } from "../common/optionsClass";

import { Textarea, Select, Button } from '@chakra-ui/react'
import {
  Text,
  Stack,
  Switch,
  Checkbox,
} from '@chakra-ui/react'
import { CheckIcon, AddIcon, CloseIcon } from '@chakra-ui/icons'

const PromptOptions: React.FC = () => {


  // TODO: diacritic colors should be in general options
  // TODO: (post-v1.0) tabs for diacritics vs transliteration prompts

  // TODO: Implement all these fields

  const [customPrompt, setCustomPrompt] = useState('');
  const [savedPrompts, setSavedPrompts] = useState<Prompt[]>([]);

  useEffect(() => {
    // Load the last selected prompt
    chrome.storage.sync.get(['selectedPrompt'], (data: { selectedPrompt?: Prompt }) => {
      setCustomPrompt(data.selectedPrompt?.text ?? '');
    });

    // Load saved prompts
    chrome.storage.sync.get(['savedPrompts'], (data: { savedPrompts?: Prompt[] }) => {
      if (!data.savedPrompts) throw new Error('No saved prompts found');
      setSavedPrompts([...data.savedPrompts]);
    });
  }, []);

  const handleCustomPromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomPrompt(event.target.value);
  };

  const handleLoadPromptChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPrompt = savedPrompts.find((prompt) => prompt.name === event.target.value);
    if (selectedPrompt) {
      setCustomPrompt(selectedPrompt.text);
      chrome.storage.sync.set({ selectedPrompt });
    }
  };

  const handleSavePrompt = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newPromptName = prompt('Enter a name for the new prompt');

    if (!customPrompt || !newPromptName) throw new Error('Prompt name and text are required');

    const result = await chrome.runtime.sendMessage<AppMessage, AppResponse>({ action: 'getSystemPromptLength' })
    if (result.status === 'error') throw new Error(result.errorMessage);
    if (!result.tokenLength) throw new Error('Prompt length unknown');

    const promptTokens = result.tokenLength;
    const newPrompt: Prompt = { name: newPromptName, text: customPrompt, tokenLength: promptTokens };

    chrome.storage.sync.get(['savedPrompts'], (data: { savedPrompts?: Prompt[] }) => {
      const updatedPrompts = [...(data.savedPrompts || []), newPrompt];
      chrome.storage.sync.set({ savedPrompts: updatedPrompts }, () => {
        alert('Prompt saved!');
        setSavedPrompts([...savedPrompts, newPrompt]);
      });
    });
  };

  const handleDeletePrompt = () => {
    const selectedPrompt = savedPrompts.find((prompt) => prompt.text === customPrompt);
    if (selectedPrompt) {
      chrome.storage.sync.get(['savedPrompts'], (data: { savedPrompts?: Prompt[] }) => {
        const updatedPrompts = (data.savedPrompts || []).filter((prompt) => prompt.name !== selectedPrompt.name);
        chrome.storage.sync.set({ savedPrompts: updatedPrompts }, () => {
          alert('Prompt deleted!');
          setCustomPrompt('');
          setSavedPrompts(updatedPrompts);
        });
      });
    }
  };

  return (
    <Stack spacing={4}>
      <Text>
        Diacritization means adding vowel marks to Arabic. Arabic can be confusing
        to learners because the language has grammar rules which depend on vowels,
        but those vowels are often not written.
      </Text>
      <Stack direction={'row'}>
        <Stack justify="flex-start" align="flex-end" spacing="0px" flex="1">
          <Text
            alignSelf="stretch">
            Add colors to diacritics
          </Text>
          <Text
            fontSize={"sm"}
            alignSelf="stretch"
          >
            Makes it easier to see diacritic marks
          </Text>
        </Stack>
        <Switch size="lg" id="colorDiacritics" />
      </Stack>
      <Stack direction="row" justify="flex-start" align="flex-end" spacing="0px" flex="1">
        <Text flex="1">
          Use custom system prompt
        </Text>
        <Switch size="lg" id="useCustomPrompt" />
      </Stack>
      <Stack>
        <form id="savePromptForm" onSubmit={handleSavePrompt}>
          <Stack>
            <Stack direction='row'>
              <Select
                id="loadPrompt"
                name="loadPrompt"
                onChange={handleLoadPromptChange}
                flex="1"
              >
                {savedPrompts.map((prompt) => (
                  <option key={prompt.name} value={prompt.name}>
                    {prompt.name}
                  </option>
                ))}
              </Select>
              <Button
                rightIcon={<CheckIcon data-icon="CkCheck" />}
                colorScheme="blue"
              >
                Save
              </Button>
              <Button
                rightIcon={<AddIcon data-icon="CkAdd" />}
                type="submit" id="savePromptBtn"
                colorScheme="blue"
              >
                Save as
              </Button>
              <Button
                rightIcon={<CloseIcon data-icon="CkClose" />}
                colorScheme="red"
                onClick={handleDeletePrompt}
              >
                Delete
              </Button>
            </Stack>
            <Textarea
              id="customPromptTextArea"
              name="customPrompt"
              rows={16}
              cols={50}
              value={customPrompt}
              onChange={handleCustomPromptChange}
            ></Textarea>
            <Checkbox
              size="lg"
              defaultChecked={false}
              variant="blue"
              alignSelf="stretch"
            >
              Ask Claude to return the number of prompt tokens when saving
            </Checkbox>
          </Stack>
        </form>
      </Stack>
    </Stack>
  )
};

export default PromptOptions;