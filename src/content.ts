function extractTextFromElement(element: Node): string {
    if (element.nodeType === Node.TEXT_NODE) {
      return element.textContent!.trim();
    }
  
    if (element.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }
  
    let text = '';
  
    if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes((element as Element).tagName)) {
      text += '\n' + element.textContent!.trim() + '\n';
    } else if (['P', 'DIV', 'SPAN'].includes((element as Element).tagName)) {
      text += element.textContent!.trim() + ' ';
    } else if ((element as Element).tagName === 'LI') {
      text += '- ' + element.textContent!.trim() + '\n';
    }
  
    for (const child of element.childNodes) {
      text += extractTextFromElement(child);
    }
  
    return text;
  }
  
  function extractText(): string {
    const body = document.body;
    return extractTextFromElement(body);
  }
  
  function chunkText(text: string): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const chunks: string[] = [];
    let currentChunk = '';
  
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= 512) {
        currentChunk += sentence;
      } else {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      }
    }
  
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
    }
  
    return chunks;
  }
  
  function diacritizeText(text: string): string {
    // TODO: Implement the logic to send the text to the LLM API for diacritization
    // and return the diacritized text
    return text;
  }
  
  function diacritizePage(): void {
    const text = extractText();
    const chunks = chunkText(text);
  
    const diacritizedChunks = chunks.map(chunk => diacritizeText(chunk));
    const diacritizedText = diacritizedChunks.join(' ');
  
    // TODO: Implement the logic to update the page with the diacritized text
    console.log(diacritizedText);
  }
  
  chrome.runtime.onMessage.addListener(function (request: { action: string }, sender, sendResponse) {
    if (request.action === 'diacritize') {
      diacritizePage();
    }
  });
  