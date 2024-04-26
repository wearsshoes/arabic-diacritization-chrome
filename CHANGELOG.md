# Changelog

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
- All previously existing features are re-enabled.
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