**Changelog**

## v0.3.1
- All previously existing features are re-enabled.
- Codebase is a bit cleaner now.

## v0.3.0
- Migrate extension to React.
- Many features temporarily disabled.

## v0.2.5
- Transliteration to Arabizi works again.
- Now possible to revert text to original.
- Now can process selected text on page, instead of whole page (but currently doesn't save the transliteration when doing so).

## v0.2.4
- started work on returning original text as is.
- Changed location of some things in database.
- Violating semver a bit here because that's a breaking change but this is private alpha.

## v0.2.3
- Implemented database to store webpage results.
- Refactored a lot of code, mainly to improve communication between different parts of the extension.
- Built the foundation for more complex website manipulation.
- Fix some nonfunctional UI elements like calculating cost.
- Setup basic unit testing in Jest (mostly for self-education purposes)

## v0.2.2
- Fixed a bug where diacritics were not displayed correctly on many websites.
- Improved performance by optimizing the rendering algorithm.
- Improved code reusability, testability, and control flow.

## v0.2.1
- Added support for additional Arabic diacritics.
- Fixed a compatibility issue with older versions of Chrome.
- Refactored code for better maintainability and readability.
- Fixed minor UI issues and improved overall stability.

## v0.2
- Added a new feature to allow users to customize the diacritic display style.
- Fixed a bug where certain diacritics were not rendered correctly in specific contexts.
- Optimized memory usage for better performance.
- Updated the user interface for a more intuitive experience.

## v0.1
- Initial release of the Arabic Diacritization Chrome extension.
- Implemented basic functionality to display Arabic text with diacritics.
- Supported a wide range of diacritic characters.