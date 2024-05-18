import { TextNode } from '../common/webpageDataClass';
import arabizi from './arabizi.json';

interface TransliterationDict {
  [key: string]: string[];
}

export function arabicToArabizi(textNodes: TextNode[], dialect: string = "msa"): TextNode[] {

  let transliterationDict: TransliterationDict
  switch (dialect) {
    case "msa":
      transliterationDict = arabizi.transliteration
  }

  function transliterate(text: string): string {
    // use shadda and sukkoon to do sun/moon transformation
    return text.replace(/اللَّه/g, 'Allah')
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
  }

  function araRuby(arabicText: string, arabiziText: string): string {
    const arabicWords = arabicText.split(' ');
    const arabiziWords = arabiziText.split(' ');
    const style = `style="display: inline-flex; flex-direction: column; text-align: center; line-height: 1.2em;"`

    let result = '';
    for (let i = 0; i < arabicWords.length; i++) {
      if (!arabicWords[i].match(/[\u0621-\u064A]/)) result += arabicWords[i] + ' ';
      else result += `<span style="line-height: 1.6em;"><ruby ${style}>${arabicWords[i]}<rp>(</rp><rt>${arabiziWords[i]}</rt><rp>)</rp></ruby></span> `;
    }

    return result.trim();
  }

  return textNodes.map(arabicText => {
    const arabiziText = transliterate(arabicText.text);
    return { ...arabicText, text: araRuby(arabicText.text, arabiziText) };
  });
}

// TODO: joined vowels -- fii instead of fiy, etc
// e.g. 'arabiyyat
// y and w at beginning of word
// al- works sometimes and not other times in a weird and inconsistent way; maybe different unicode pts?
// al gets dash only if near beginning of word (define a list of prefixes...?)
// treat Allah special


// TODO: punctuation (add in arabizi.json)

