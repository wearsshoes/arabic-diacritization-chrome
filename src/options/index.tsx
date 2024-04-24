import React from 'react';
// import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import Options from './options';
import './options.css';

ReactDOM.createRoot(document.getElementById('options-root')!).render(
    <React.StrictMode>
        <Options />
    </React.StrictMode>,
)