import React, { useEffect, useState } from 'react';
import defaultPrompts from '../background/defaultPrompts.json';
import { Prompt } from '../common/types';

import { HStack, VStack, Input, Textarea, Select, Heading, Button } from '@chakra-ui/react'

const LLMOptions: React.FC = () => {
  const [llmChoice, setLlmChoice] = useState('haiku');
  const [customPrompt, setCustomPrompt] = useState('');
  const [savedPrompts, setSavedPrompts] = useState<Prompt[]>([]);

  useEffect(() => {

    // Load LLM choice
    chrome.storage.sync.get(['llmChoice'], (data: { llmChoice?: string }) => {
      setLlmChoice(data.llmChoice || 'haiku');
    });

    // Load the last selected prompt
    chrome.storage.sync.get(['selectedPrompt'], (data: { selectedPrompt?: Prompt }) => {
      const selected = data.selectedPrompt?.name;
      setCustomPrompt(defaultPrompts[0].text || '');
      if (selected) {
        //TODO: this should just ask the background worker for the prompt text
        const selectedPrompt = defaultPrompts.find((prompt) => prompt.name === selected);
        if (selectedPrompt) {
          setCustomPrompt(selectedPrompt.text);
        }
      }
    });

    // Load saved prompts
    chrome.storage.sync.get(['savedPrompts'], (data: { savedPrompts?: Prompt[] }) => {
      if (data.savedPrompts) {
        setSavedPrompts([...defaultPrompts, ...data.savedPrompts]);
      } else {
        setSavedPrompts(defaultPrompts);
      }
    });
  }, []);

  const handleLlmChoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedChoice = event.target.value;
    setLlmChoice(selectedChoice);
    chrome.storage.sync.set({ llmChoice: selectedChoice });
  };

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

  const handleSavePrompt = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newPromptName = event.currentTarget.newPromptName.value;
    if (customPrompt && newPromptName) {
      const newPrompt: Prompt = { name: newPromptName, text: customPrompt };
      chrome.storage.sync.get(['savedPrompts'], (data: { savedPrompts?: Prompt[] }) => {
        const updatedPrompts = [...(data.savedPrompts || []), newPrompt];
        chrome.storage.sync.set({ savedPrompts: updatedPrompts }, () => {
          alert('Prompt saved!');
          setSavedPrompts([...savedPrompts, newPrompt]);
        });
      });
    }
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
    <VStack>
      <Heading size='md'>Model</Heading>
      <Select id="llmChoice" name="llmChoice" value={llmChoice} onChange={handleLlmChoiceChange}>
        <option value="haiku">Claude Haiku</option>
      </Select>
      <Heading size='md'>Custom Prompt</Heading>
      <Textarea
        id="customPromptTextArea"
        name="customPrompt"
        rows={16}
        cols={50}
        value={customPrompt}
        onChange={handleCustomPromptChange}
      ></Textarea>
      <HStack>
        <VStack>
          <Heading size='md'>Saved Prompts</Heading>
          <HStack>
            <Select id="loadPrompt" name="loadPrompt" onChange={handleLoadPromptChange}>
              {savedPrompts.map((prompt) => (
                <option key={prompt.name} value={prompt.name}>
                  {prompt.name}
                </option>
              ))}
            </Select>
            <Button id="deletePromptBtn" onClick={handleDeletePrompt}>Delete</Button>
          </HStack>
        </VStack>
        <VStack>
          <Heading size='md'>New Prompt Name</Heading>
          <form id="savePromptForm" onSubmit={handleSavePrompt}>
            <HStack>
              <Input type="text" id="newPromptName" name="newPromptName" />
              <Button type="submit" id="savePromptBtn">Save</Button>
            </HStack>
          </form>
        </VStack>
      </HStack>
    </VStack>
  );
};

export default LLMOptions;