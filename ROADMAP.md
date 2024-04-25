# Features
- option to translate arabic pages by default
- dialect detection
## Arabizi
- lebanese arabizi support
- duolingo-style arabizi for MSA
- arabizi transliterate al- rules, etc.
## Partial diacritization
- strategic partial diacritization
- option to toggle case endings

# UI
- nicer styling overall
## overlay
- content overlay gui for info
- progress bar in overlay
- field for entering text for on-the-fly diacritization (much easier api call)
## popup
- get calculateCost working again
## options
- arabizi style chooser
- more stats on usage
- way to get feedback on app experience

# Under the hood
- processing selected text should also save results to IndexedDB.
- some parts of background.ts are real spaghetti code that need to be cleaned up.

# pie in sky
- local inference
- take wrong-word feedback and do something useful with it
- hebrew support?