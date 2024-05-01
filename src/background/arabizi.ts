// Arabizi diacritization
// still need to do a lot of things: sun/moon transformation
// fii instead of fiy, etc
// man, maybe there's even different pronunciation choices for dialects...? too much to consider...
// simple one: get the punctuation marks to change to english equivs

import arabizi from '../../public/arabizi.json';

interface TransliterationDict {
    [key: string]: string[];
  }  

export function arabicToArabizi(texts: string[], transliterationDict: TransliterationDict = arabizi.transliteration): string[] {
    console.log('Transliterating', texts);
    return texts.map(arabicText => {
      if (arabicText && arabicText.length > 0) {
        return arabicText
          .replace(/[ْ]/g, '') // remove sukoon
          .replace(/([\u0621-\u064A])([\u064B-\u0652]*)(\u0651)/g, '$1$1$2') // replace all cases of shadda with previous letter
          .split('')
          .map(char => transliterationDict[char]
            ?.[0] || char).join('')
      } else {
        return ''
      }
    }
    );
  }