# Changelog

## 1.0.0 (Current)
Improvements
- Removed useless files and functions

## 0.4.4 (2024-05-29)
Improvements
- Major under the hood improvements; replace indexedDB with chrome.storage
- Partial diacritizations are now saved to reduce load time (still buggy.)
- Bugfix: Saves are now properly regenerated for changed pages.

Known bugs:
- Selecting small amounts of text doesn't work.
- Toggling in the widget doesn't play nicely with partial diacritization.

## 0.4.3 (2024-05-25)
- You can now flip between original, diacritics, and transliteration easily once the whole page is rendered.
- Saves now work again! Saves you some compute money.
- Option to process selected text from widget.
- Current jobs are cancelled when you close a tab.
- Site language detection now triggers on arabic pages without language labels.
- Internally, the labeling of HTMLElements is better organized.
- Console logs are simpler and more enlightening now.

Known bugs:
- Saves will break webpages that have changed since save time.
- Options page is a bit broken.

## 0.4.2 (2024-05-24)
- Rename to "Easy Peasy Arabizi"
- Now adds romanization (arabizi) as ruby text!
- Text streams fluidly onto the page as Claude returns it rather than updating in chunks.
- Bilingual widget.
- Better validation so Claude doesn't screw up as much.
- Widget auto-hides on non-Arabic pages.
- Command+Shift+U to show/hide widget now.
- Nicer progress bar.
- Internal DOM logic much neater now.
- Known bug: saves don't work currently.

## 0.4.1 (2024-05-12)
- There's now a cancel button on the widget.
- Fixed problems with DOM element matching where the program could not always find correct element to replace.
- Fixed problem where if you navigate away from the page, the diacritization didn't stop.
- When replacing with original, no longer re-indexes DOM.

## 0.4 (2024-05-05)
- New corner widget! Command+Option+2 to show/hide.
- Option to toggle between original, diacritized, and arabizi.
- Progress bar works now.
- Arabizi now enabled again, somewhat better but still beta.
- Fewer extraneous vowels in Arabizi.
- Selects main content with more accuracy now.
- Cost estimate displayed in popup again.
- Saves and retrieves data with more consistency.
- Added option to clear saved data for current webpage in popup.
- Re-indexing after deliberate change fixed (removed some unnecessarily reloading React components)
- Continued to improve program structuring and flow for clearer communication.
- Many bugfixes, as always.

Known bugs:
- Webpage saves don't work properly, and don't show up properly.
- Some problems with DOM element matching; cannot always find correct element to replace.
- Claude still giving malformed results pretty often.
- Repeated requests lead to really weird results.

## 0.3.3 (2024-04-25)
- Implemented a popup progress bar to show how many batches the API has completed.
- Each section of the site sent to the API now auto-updates as soon as the API has processed it.
- Removed SWC compiling in favor of standard vite ts compiler for extension hot reload compatibility.
- Wrote out roadmap for MVP and future releases.
- Arabizi default format now conforms to Duolingo's transliteration rules.
- Moved content.tsx and broke it up.

## 0.3.2 (2024-04-25)
- Created styled UIs for options page and extension popup using Chakra UI.
- Slight improvements to dev environment.
- Cleanup unnoticed problems from previous merge.

## 0.3.1 (2024-04-24)
- All previously existing features are re-enabled (some are broken).
- Codebase is a bit cleaner now.

## 0.3.0 (2024-04-24)
- Migrate extension to React.
- Many features temporarily disabled.

## 0.2.5 (2024-04-24)
- Transliteration to Arabizi works again.
- Now possible to revert text to original.
- Now can process selected text on page, instead of whole page (but currently doesn't save the transliteration when doing so).

## 0.2.4 (2024-04-20)
- started work on returning original text as is.
- Changed location of some things in database.
- Violating semver a bit here because that's a breaking change but this is private alpha.

## 0.2.3 (2024-04-19)
- Implemented database to store webpage results.
- Refactored a lot of code, mainly to improve communication between different parts of the extension.
- Built the foundation for more complex website manipulation.
- Fix some nonfunctional UI elements like calculating cost.
- Setup basic unit testing in Jest (mostly for self-education purposes)

## 0.2.2 (2024-04-13)
- Fixed a bug where diacritics were not displayed correctly on many websites.
- Improved performance by optimizing the rendering algorithm.
- Improved code reusability, testability, and control flow.

## 0.2.1 (2024-04-13)
- Added support for additional Arabic diacritics.
- Fixed a compatibility issue with older versions of Chrome.
- Refactored code for better maintainability and readability.
- Fixed minor UI issues and improved overall stability.

## 0.2 (2024-04-12)
- Added a new feature to allow users to customize the diacritic display style.
- Fixed a bug where certain diacritics were not rendered correctly in specific contexts.
- Optimized memory usage for better performance.
- Updated the user interface for a more intuitive experience.

## 0.1 (2024-04-10)
- Initial release of the Arabic Diacritization Chrome extension.
- Implemented basic functionality to display Arabic text with diacritics.
- Supported a wide range of diacritic characters.