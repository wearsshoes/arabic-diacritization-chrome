# MVP

## Bugs

- arabizi doesn't work right now.
- calculateCost doesn't work.

## Features

- option to translate arabic pages by default

### Arabizi

- arabizi transliterate al- rules, etc.

## UI

### Overlay

- cancel button

### Popup
- inform user whether cached save exists for page

### Options page
- supply instructions on getting API key
- provide contact info for feedback
- have custom prompts stored by task

# FUTURE

## Features

- dialect detection


### Arabizi

- lebanese arabizi support

## UI

- nicer styling overall

### overlay

- field for entering text for on-the-fly diacritization (much easier api call)

### popup

- choose among saved prompts before clicking start
- button to re-show overlay if it disappeared

### options page

- arabizi style chooser
- more stats on usage
- choose how many max tokens you want to send to claude

## Under the hood

- processing selected text should also save results to IndexedDB.
- some parts of background.ts are real spaghetti code that need to be cleaned up.
- stuff is loading a lot slower since the react migration.

## pie in sky

- local inference
- take wrong-word feedback and do something useful with it
- hebrew support?
- subscription pricing and/or free api access
- do hovertext support
- have translations to english in popup