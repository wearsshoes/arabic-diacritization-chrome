import React from 'react';
import ReactDOM from 'react-dom/client';
import './optionsPage.css';
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

ReactDOM.createRoot(document.getElementById('options-root')!).render(
    <React.StrictMode>
        <Options />
    </React.StrictMode>,
)