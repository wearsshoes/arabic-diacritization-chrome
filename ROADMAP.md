# Roadmap

## MVP

### Bugs

- 1.0 need to structure AppMessage and AppResponse more strictly based on the message types to avoid errors.
- 1.0 widget should send textNodes directly to update.
- 1.0 track partial saves better.

### UI

- 1.0 Redesign extension popup to be simpler and cleaner
- 1.0 show cost for all models and total
- 1.0 have widget have button to open popup

## Future

### Bugs

- 1.1.x something's messing with browser's back/forward cache and forcing reload

### Features

- 1.1.x option to use other models besides Claudes
- 1.1.x partial diacritization
- 2.x dialect detection

### Implementation

- 2.x handle errors in a more standard way.
-

#### Arabizi

- 1.2.x lebanese arabizi support
- 1.2.x in dialect -- handle proper nouns? Qatar and not 'atar
- 2.x other dialects
- 1.3.x let people write custom diacritizations

### UI

- 1.1.x Add FAQs/tooltips to options page.
- 1.2.x extension UI elements in bilingual Arabic/English
- 1.1.x use popovers rather than alerts.

#### widget

- 1.1.x field for entering text for on-the-fly diacritization (much easier api call)
- 1.4.x have translations to arabizi and english in hovering popup

#### popup

- 1.1.x choose among saved prompts before clicking start

#### options page

- 1.1.x have custom prompts stored by task
- 1.1.x basic arabizi transliteration preferences (eg kh vs 7')
- 1.3.x more stats on usage, like which webpage a call corresponded to?


## Pie in sky

- 2.x take wrong-word feedback and do something useful with it
- 3.x hebrew support?
- 3.x subscription pricing and/or free API access
- x.x option to do local inference instead of API