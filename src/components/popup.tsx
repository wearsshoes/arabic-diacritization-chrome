import React from 'react';

import ReactDOM from 'react-dom/client';

const Popup: React.FC = () => {

  const beginDiacritization = async (method: string) => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'sendToDiacritize', method });
      console.log(`${method} response:`, response);
    } catch (error) {
      console.error(`Error in ${method}:`, error);
    }
  };

  return (
    <div>
      {/* Render the popup content */}
      <h1>ArabEasy</h1>
      <p>This extension adds full diacritics (tashkeel) to Arabic text via Claude Haiku.</p>
      <p>Features:</p>
      <ul>
        <li>Diacritize Arabic text on any webpage</li>
        <li>Customizable diacritization options</li>
        <li>Fast and accurate diacritization powered by LLM</li>
      </ul>
      {/* <div>
        <select id="diacritizationSelector">
          <option value="diacritize">Full Diacritization</option>
          <option value="arabizi">Arabizi</option>
        </select>
        </div> */}
        <div>
          {/* <p>{diacritizeMessage}</p> */}
          <button onClick={() => beginDiacritization('diacritize')}>Diacritize Page</button>
        </div>
        <div>
          {/* <p>{arabiziMessage}</p> */}
          <button onClick={() => beginDiacritization('arabizi')}>Convert to Arabizi</button>
        </div>
        <div>
          <p>{ }</p>
          <button onClick={() => chrome.runtime.openOptionsPage()}>More options</button>
        </div>
        {/* <h2>Page information</h2>
        <p>Language: {pageLanguage}</p>
        <p>Task: {selectedPrompt}</p>
        <p>Prompt length: {promptLength}</p>
        <p>Character count: {characterCount}</p>
        <p>Estimated output token count: {outputTokenCount}</p>
        <p>Model: {model}</p>
        <p>
          Estimated cost: ${costEstimate.toFixed(2)}
          <button onClick={calculateCost}>Calculate</button>
        </p>
      </div */}
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>,
  );
}

export default Popup;