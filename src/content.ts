console.log('Content script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "testMessage") {
      console.log("content script message received");
  }
});

// function prepareForDiacritization() {
//   const chunkSize = 500;
//   const chunks: Array<{
//     text: string;
//     element: Element;
//     index: number;
//   }> = [];

//   function traverseDOM(element: Element) {
//     if (element.nodeType === Node.TEXT_NODE) {
//       const text = element.textContent || '';
//       const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

//       sentences.forEach((sentence, index) => {
//         const start = text.indexOf(sentence);
//         const end = start + sentence.length;
//         const chunk = text.slice(start, end);

//         chunks.push({
//           text: chunk,
//           element: element.parentElement!,
//           index: start,
//         });

//         element.textContent = text.slice(0, start) + `{{chunk_${chunks.length - 1}}}` + text.slice(end);
//       });
//     } else {
//       Array.from(element.childNodes).forEach((child) => {
//         if (child.nodeType === Node.ELEMENT_NODE) {
//           traverseDOM(child as Element);
//         }
//       });
//     }
//   }

//   traverseDOM(document.body);

//   console.log(chunks);
// }