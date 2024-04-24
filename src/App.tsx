import React from 'react';
import './App.css';
import Popup from './components/popup';
import Options from './components/options';

const App: React.FC = () => {
  return (
    <div>
      {/* Render the appropriate component based on the current page */}
      {window.location.pathname === '/options.html' ? (
        <Options />
      ) : (
        <Popup />
      )}
    </div>
  );
};

export default App;