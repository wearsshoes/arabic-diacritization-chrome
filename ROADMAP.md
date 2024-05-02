# Roadmap

## MVP

### Bugs

- arabizi doesn't work right now.
- calculateCost doesn't work.

#### Arabizi

- arabizi transliterate al- rules, etc.

### UI

#### Overlay

- cancel button

#### Popup

- inform user whether cached save exists for page

#### Options page

- have custom prompts stored by task

## Future

### Features

- dialect detection
- option to translate arabic pages by default (needs to be cheaper first? implement stat tracking first?)

#### Arabizi

- lebanese arabizi support
- in dialect -- handle proper nouns? Qatar and not 'atar
- other dialects
- let people write custom diacritizations

### UI

- nicer styling overall

#### overlay

- field for entering text for on-the-fly diacritization (much easier api call)

#### popup

- choose among saved prompts before clicking start
- button to re-show overlay if it disappeared

#### options page

- arabizi style chooser
- more stats on usage
- choose how many max tokens you want to send to claude

### Under the hood

- processing selected text should also save results to IndexedDB.
- some parts of background.ts are real spaghetti code that need to be cleaned up.
- stuff is loading a lot slower since the react migration.

## Pie in sky

- local inference
- take wrong-word feedback and do something useful with it
- hebrew support?
- subscription pricing and/or free api access
- do hovertext support
- have translations to english in popup