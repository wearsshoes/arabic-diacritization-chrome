# Roadmap

## MVP

### Bugs

- [x] transliteration isn't working right now (why?)
- [ ] when there is a saved version of the page, clicking on the transliteration method in the widget does not update the page.
- [ ] when a partial diacritization has been done, the widget does not correctly handle the existing text based on save.
- [ ] when a diacritization process is aborted, the part of the webpage diacritized so far is not saved.
- [ ]
- options page still being implemented

- 1.0 need to structure AppMessage and AppResponse more strictly based on the message types to avoid errors.
- 1.0 widget should send textNodes directly to update.
- 1.0 track partial saves better.

### UI

- 1.0 implement toggle between arabizi and ala-lc.
- 1.0 in widget, have text be 'ala-lc' or 'arabizi' depending on option.
- 1.0 Redesign extension popup to be simpler and cleaner
- 1.0 have widget have button to open popup

## Future

### Bugs

- 1.1.x something's messing with browser's back/forward cache and forcing reload

### Features

- 1.1.x option to use other models besides Claudes
- 1.2.x partial diacritization
- 3.x subscription pricing and/or free API access

### Implementation

- 1.1.x handle errors in a more standard way.

#### Arabizi

- 2.x API-based arabizi.
- 2.x dialect detection
- 2.x dialect arabizi support (lebanese, egyptian)

### UI

- 1.1.x Add tooltips to options page.
- 1.1.x use popovers rather than alerts.
- 1.1.x Options page, popup in bilingual Arabic/English

#### widget

- 1.1.x field for entering text for on-the-fly diacritization (much easier api call)
- 3.x have translations to arabizi and english in hovering popup

#### options page

- 1.2.x have custom prompts stored by task
- 1.2.x full page for transliteration options
- 1.3.x more stats on usage, like which webpage a call corresponded to?

## Pie in sky

- 3.x or new app: hebrew support