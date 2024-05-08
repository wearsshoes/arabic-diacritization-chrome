import arabizi from './arabizi.json';

interface TransliterationDict {
  [key: string]: string[];
}

export function arabicToArabizi(texts: string[], dialect: string = "msa"): string[] {
  console.log('Transliterating', texts);

  let transliterationDict: TransliterationDict
  if (dialect === "msa") {
    transliterationDict = arabizi.transliteration
  }

  return texts.map(arabicText => {
    if (arabicText && arabicText.length > 0) {

      return arabicText
        // use shadda and sukkoon to do sun/moon transformation
        .replace(/اللَّه/g, 'Allah')
        .replace(/(اَ?ل)([\u0621-\u064A])([\u064B-\u0652]*)(\u0651)/g, 'a$2-$2$3')
        // .replace(/([\u0621-\u0652])(اَ?لْ?)/g, '$1\'l-')
        .replace(/(^|\s)(اَ?لْ?)/g, '$1al-')
        
        // replace all other cases of shadda with previous letter
        .replace(/([\u0621-\u064A])([\u064B-\u0652]*)(\u0651)/g, '$1$1$2')

        // remove remaining sukoon
        .replace(/[ْ]/g, '')

        // map remaining arabic characters according to transliterationDict
        .split('')
        .map(char => transliterationDict[char]?.[0] || char)
        .join('')

      // might want to post-parse weird vowel clusters as a kludge
    } else { return '' }

  });
}

// TODO: joined vowels -- fii instead of fiy, etc
// e.g. 'arabiyyat
// y and w at beginning of word
// al- works sometimes and not other times in a weird and inconsistent way; maybe different unicode pts?
// al gets dash only if near beginning of word (define a list of prefixes...?)
// treat Allah special


// TODO: punctuation (add in arabizi.json)

