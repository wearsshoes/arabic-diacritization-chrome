import React, { useEffect } from "react";

const ContentOverlay: React.FC = () => {
  useEffect(() => {
    console.log('Hello from the content script!');
  }, []);

  // add a hello world overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.width = '20%';
    overlay.style.height = '20%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.color = 'white';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '999999999';
    overlay.style.direction = 'ltr';    
    overlay.innerText = 'Hello, world!';
    document.body.appendChild(overlay);

  return null;
};

export default ContentOverlay;