import React from 'react';

const Options: React.FC = () => {

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear the cache?')) {
      alert('jk, lol: Cache clearing is disabled in this version.');
    }
  };

  const handleClearDatabase = () => {
    if (confirm('Are you sure you want to clear the database?')) {
      alert('jk, lol: Database clearing is disabled in this version.');
    }
  };

  return (
    <div className="container">
      <h1>Extension Options</h1>
      <p>Customize your extension settings here.</p>
      
      <div id="dataManagement">
        <h2>Cache and Database Management</h2>
        <div id="cacheContent">
          <h3>Cache Content:</h3>
          <p id="cacheContentList"></p>
          <p id="cacheStatus"></p>
          <button id="clearCacheBtn" onClick={handleClearCache}>
            Clear Cache
          </button>
          <p id="cacheMessage"></p>
        </div>
        <div id="databaseContent">
          <h3>Database Content:</h3>
          <p id="databaseSize"></p>
          <button id="clearDatabaseBtn" onClick={handleClearDatabase}>
            Clear Database
          </button>
          <p id="databaseMessage"></p>
        </div>
      </div>
    </div>
  );
};

export default Options;