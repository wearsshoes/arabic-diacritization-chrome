import React, { useEffect, useState } from 'react';
import { AppMessage, AppResponse } from '../common/types';
import { Prompt } from "../common/optionsClass";

import {
  Textarea,
  Select,
  Button,
  ButtonGroup,
  FormControl,
  Text,
  Stack,
  Switch,
  Checkbox,
} from '@chakra-ui/react';
import { CheckIcon, AddIcon, CloseIcon } from '@chakra-ui/icons';

const getNewName = () => {
  let name = '';
  while (!name) {
    name = prompt('Enter a name for the new prompt:') ?? '';
  }
  return name;
}

const PromptOptions: React.FC = () => {

  // TODO: (post-v1.0) tabs for diacritics vs transliteration prompts
  // TODO: popovers would be nicer than alerts.

  const [enabled, setEnabled] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [savedPrompts, setSavedPrompts] = useState<Prompt[]>([]);
  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const [isSaveAs, setIsSaveAs] = useState(false);
  const [checkTokenLength, setCheckTokenLength] = useState(false);

  const selectedPrompt: Prompt = savedPrompts[activePromptIndex];

  // Initialize and setup listener for changes to extension options
  useEffect(() => {
    chrome.storage.sync.get(['useCustomPrompt', 'activePromptIndex', 'savedPrompts', 'checkTokenLength'], (data) => {
      setEnabled(data.useCustomPrompt || false);
      setActivePromptIndex(data.activePromptIndex || 0);
      setSavedPrompts([...data.savedPrompts] || []);
      setCheckTokenLength(data.checkTokenLength || false);
    });

    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      for (const [key, change] of Object.entries(changes)) {
        switch (key) {
          case 'useCustomPrompt':
            setEnabled(change.newValue);
            break;
          case 'activePromptIndex':
            setActivePromptIndex(change.newValue);
            break;
          case 'savedPrompts':
            setSavedPrompts(change.newValue);
            break;
          case 'checkTokenLength':
            setCheckTokenLength(change.newValue);
            break;
          default:
            break;
        }
      }
    };

    chrome.storage.onChanged.addListener(storageListener);

    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  useEffect(() => {
    setPromptText(selectedPrompt?.text ?? '');
  }, [selectedPrompt]);

  const handleUseCustomPromptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target;
    const newIndex = checked ? activePromptIndex : 0;

    chrome.storage.sync.set({ activePromptIndex: newIndex, useCustomPrompt: checked });
    setActivePromptIndex(newIndex);
    setEnabled(checked);
  }

  const handlePromptChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextPrompt = savedPrompts.findIndex((prompt) => prompt.name === event.target.value);

    if (promptText !== selectedPrompt?.text && !confirm('You have unsaved changes. Do you want to discard them?')) {
      event.target.value = savedPrompts[activePromptIndex].name;
      return;
    }

    chrome.storage.sync.set({ activePromptIndex: nextPrompt });
    setActivePromptIndex(nextPrompt);
  };

  const handleSavePrompt = async (event: React.FormEvent<HTMLFormElement>, isSaveAs: boolean) => {
    event.preventDefault();

    const promptName = isSaveAs ? getNewName() : selectedPrompt?.name || 'New Prompt';
    const existingPrompt = savedPrompts.find((prompt) => prompt.name === promptName);

    if (existingPrompt && isSaveAs) {
      const overwrite = confirm('A prompt with this name already exists. Do you want to overwrite it?');
      if (!overwrite) return;
    }

    const updatedPrompts = savedPrompts.filter((prompt) => prompt.name !== promptName);
    const newPrompt: Prompt = { name: promptName, text: promptText, tokenLength: 0, default: false };

    if (checkTokenLength) {
      const result = await chrome.runtime.sendMessage<AppMessage, AppResponse>({ action: 'getSystemPromptLength', promptText})
      if (result.status === 'error') throw new Error(result.errorMessage);
      newPrompt.tokenLength = result.tokenLength || 0;
    }

    updatedPrompts.push(newPrompt);
    chrome.storage.sync.set({ savedPrompts: updatedPrompts, activePromptIndex: updatedPrompts.indexOf(newPrompt) });
  };

  const handleDeletePrompt = () => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    const index = activePromptIndex;
    const updatedPrompts = (savedPrompts).filter((_, i) => i !== index);
    const nextPrompt = updatedPrompts[index] || updatedPrompts[0];
    chrome.storage.sync.set({ savedPrompts: updatedPrompts, activePromptIndex: updatedPrompts.indexOf(nextPrompt) });
    setSavedPrompts(updatedPrompts);
    setActivePromptIndex(updatedPrompts.indexOf(nextPrompt));
  };

  const handleCheckTokenLengthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCheckTokenLength(event.target.checked);
    chrome.storage.sync.set({ checkTokenLength: event.target.checked });
  }

  return (
    <Stack spacing={4}>
      <Text>
        Diacritization means adding vowel marks to Arabic. Arabic can be confusing
        to learners because the language has grammar rules which depend on vowels,
        but those vowels are often not written.
      </Text>
      <Stack direction="row" justify="flex-start" align="flex-end" spacing="0px" flex="1">
        <Text flex="1">
          Use custom system prompt
        </Text>
        <Switch
          size="lg"
          id="useCustomPrompt"
          onChange={handleUseCustomPromptChange}
          isChecked={enabled}
        />
      </Stack>
      <Stack>
        <form
          id="savePromptForm"
          onSubmit={(event) => handleSavePrompt(event, isSaveAs)}
        >
          <FormControl isDisabled={!enabled}>
            <Stack>
              <Stack direction='row'>
                <Select
                  id="loadPrompt"
                  name="loadPrompt"
                  onChange={handlePromptChange}
                  flex="1"
                  value={selectedPrompt?.name}
                >
                  {savedPrompts.map((prompt) => (
                    <option key={prompt.name} value={prompt.name}>
                      {prompt.name} ({prompt.tokenLength !== 0 ? prompt.tokenLength : 'N/A'} tokens)
                    </option>
                  ))}
                </Select>
                <ButtonGroup isDisabled={!enabled}>
                  {/* TODO: Save Button Does Nothing */}
                  <Button
                    rightIcon={<CheckIcon data-icon="CkCheck" />}
                    colorScheme="blue"
                    type="submit"
                    id="savePromptBtn"
                    isDisabled={selectedPrompt?.default || promptText.length === 0}
                    onClick={() => setIsSaveAs(false)}
                  >
                    Save
                  </Button>
                  <Button
                    rightIcon={<AddIcon data-icon="CkAdd" />}
                    type="submit" id="saveAsBtn"
                    colorScheme="blue"
                    isDisabled={promptText.length === 0 || !enabled}
                    onClick={() => setIsSaveAs(true)}
                  >
                    Save as
                  </Button>
                  <Button
                    rightIcon={<CloseIcon data-icon="CkClose" />}
                    colorScheme="red"
                    onClick={handleDeletePrompt}
                    isDisabled={savedPrompts.length === 1 || selectedPrompt?.default}
                  >
                    Delete
                  </Button>
                </ButtonGroup>
              </Stack>
              <Textarea
                id="promptText"
                name="promptText"
                rows={16}
                cols={50}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
              ></Textarea>
              <Checkbox
                id="checkTokenLength"
                size="lg"
                defaultChecked={false}
                variant="blue"
                alignSelf="stretch"
                isChecked={checkTokenLength}
                onChange={handleCheckTokenLengthChange}
              >
                Ask Claude to return the number of prompt tokens when saving
              </Checkbox>
            </Stack>
          </FormControl>
        </form>
      </Stack>
    </Stack>
  )
};

export default PromptOptions;