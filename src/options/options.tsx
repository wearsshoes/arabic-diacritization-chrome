import React from 'react';
import LLMOptions from './llmOptions';
import APIKeyForm from './apiKeyForm';
import DataManagement from './dataManagement';

const Options: React.FC = () => {
  return (
    <div className="container">
      <h1>Extension Options</h1>
      <p>Customize your extension settings here.</p>
      <LLMOptions />
      <APIKeyForm />
      <DataManagement />
    </div>
  );
};

export default Options;