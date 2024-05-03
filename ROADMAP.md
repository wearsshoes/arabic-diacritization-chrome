# Roadmap

## MVP

### Bugs

- if popup is activated before page is fully loaded, listeners do not connect properly.
- diacritizations will often re-initiate despite an existing save.
- Saving arabizi removes existing fullDiacritization save in some cases.
- still attempts translation sometimes; check that number of non-diacritic arabic letters in prompt matches number of arabic letters in response.

#### Arabizi

- arabizi transliterate al- rules
- stream arabizi edits, just like with fullDiacritization

### UI

- Redesign UI elements to be simpler and cleaner.
- Add cancel button to overlay.
- Minimize overlay on finish.
- Option to show/hide overlay entirely.
- Add FAQs/tooltips to options page.
- Track DOMContentLoaded in popup/overlay and prevent diacritization until then.

## Future

### Features

- partial diacritization
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

- have custom prompts stored by task
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