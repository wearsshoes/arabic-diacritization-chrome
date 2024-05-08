# Roadmap

## MVP

## Features
- 0.4.1 only claude haiku is enabled.
- 0.4.3 only default prompt is enabled.
- 1.0 when there's saved results, partially update based on hashes

### Bugs
- 0.4.1 Some problems with DOM element matching; cannot always find correct element to replace.
- 0.4.2 Webpage saves don't work properly, and don't show up properly.
- 0.4.2 Repeated requests lead to really weird results.
- 0.4.3 Claude still giving malformed results pretty often.
- 1.0 Claude still attempts translation sometimes. Check that the number of non-diacritic arabic letters in prompt matches number of arabic letters in response.

#### Arabizi

- 0.4.1: incremental arabizi updates, just like with fullDiacritization

### UI

- 0.4.1 Add cancel button to widget.
- 0.4.3 Redesign options page to be simpler and cleaner.
- 0.4.3 Add FAQs/tooltips to options page.
- 0.4.3 Redesign extension popup to be simpler and cleaner.

## Future

### Bugs

- 1.1.x something's messing with browser's back/forward cache and forcing reload 
- 1.1.x processing selected text should also save results to IndexedDB.

### Features

- 1.1.x partial diacritization
- 1.1.x option to translate arabic pages by default (needs to be cheaper first? implement stat tracking first?)
- 1.2.x streaming from claude API
- 2.x dialect detection
- 2.x option to use other models besides Claudes

#### Arabizi
- 1.1.x: make arabizi translation look more natural
- 1.1.x: add alternate romanization to ISO 233-2 (actually might be easier than arabizi)
- 1.2.x lebanese arabizi support
- 1.2.x in dialect -- handle proper nouns? Qatar and not 'atar
- 2.x other dialects
- 1.3.x let people write custom diacritizations

### UI

- 1.2.x extension UI elements in bilingual Arabic/English 

#### widget

- 1.1.x field for entering text for on-the-fly diacritization (much easier api call)
- 1.4.x have translations to arabizi and english in hovering popup

#### popup

- 1.1.x choose among saved prompts before clicking start

#### options page

- 1.1.x have custom prompts stored by task
- 1.1.x basic arabizi transliteration preferences (eg kh vs 7')
- 1.1.x choose how many max tokens you want to send to claude
- 1.3.x more stats on usage


## Pie in sky

- 2.x take wrong-word feedback and do something useful with it
- 3.x hebrew support?
- 3.x subscription pricing and/or free API access
- x.x option to do local inference instead of API