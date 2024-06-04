import { TextNode } from '../common/webpageDataClass';
import transliterations from './transliterations.json';

interface TransliterationDict {
  [key: string]: string[];
}

// export function arabicToArabizi(textNodes: TextNode[]): TextNode[] {
  export function arabicToArabizi(textNodes: TextNode[], dialect: string = "msa"): TextNode[] {

  let chars: TransliterationDict;
  let digraphs: TransliterationDict;
  let trigraphs: TransliterationDict;
  switch (dialect) {
    case "msa":
  chars = transliterations['ala-lc'].chars;
  digraphs = transliterations['ala-lc'].digraphs;
  trigraphs = transliterations['ala-lc'].trigraphs;
  }

  function transliterate(text: string): string {
    // use shadda and sukkoon to do sun/moon transformation
    let result = '';

    // text = transliterateTaMarbuta(text);

    text = text.replace(/اللَّه/g, 'Allah')

      .replace(/(?<=\s|^)(بِالْ|لِلْ|كَالْ|فَالْ|وَالْ)/g, (match) => {
        switch (match) {
          case "بِالْ":
            return "bil-";
          case "لِلْ":
            return "lil-";
          case "كَالْ":
            return "kal-";
          case "فَالْ":
            return "fal-";
          case "وَالْ":
            return "wal-";
          default:
            return match;
        }
      })

      .replace(/(اَ?ل|al-)([\u0621-\u064A])([\u064B-\u0652]*)(\u0651)/g, 'a$2-$2$3')
      .replace(/(^|\s)(اَ?لْ?)/g, '$1al-')

      // handle arabic characters at beginning of word
      // open alif
      .replace(/(?<=[^\u0621-\u0652])ا(?=[\u0621-\u0652])/g, 'i')
      // alif waslah
      .replace(/(?<=[^\u0621-\u0652])آ(?=[\u0621-\u0652])/g, 'ā')
      // .replace(/(?<=[^\u0621-\u0652])آ(?=[\u0621-\u0652])/g, 'aa')
      // hamza
      // .replace(/(?<=[^\u0621-\u0652])[ءأإ](?=[\u0621-\u0652])/g, '2')
      .replace(/(?<=[^\u0621-\u0652])[ءأإ](?=[\u0621-\u0652])/g, '')

      // handle arabic characters at end of word
      // defective root shadda iyy ending
      .replace(/(?<=[\u0621-\u0652])ِيّ(?=[^\u0621-\u0652])/g, 'ī')
      // .replace(/(?<=[\u0621-\u0652])ِيّ(?=[^\u0621-\u0652])/g, 'ii')
      .replace(/(?<=[\u0621-\u0652])ُوّ(?=[^\u0621-\u0652])/g, 'ūw')
      // .replace(/(?<=[\u0621-\u0652])ُوّ(?=[^\u0621-\u0652])/g, 'uw')
      .replace(/(?<=[\u0621-\u0652])َوّ(?=[^\u0621-\u0652])/g, 'aww')
      .replace(/(?<=[\u0621-\u0652])وا(?=[^\u0621-\u0652])/g, 'u')

      // ignore case endings
      .replace(/(?<=[\u0621-\u0652])[\u064B-\u0650](?=(\u0651)?[^\u0621-\u0652])/g, '')


      // handle middle of word

      // replace all other cases of shadda with previous letter
      .replace(/([\u0621-\u064A])([\u064B-\u0652]*)(\u0651)/g, '$1$1$2')

      // remove remaining sukoon
      .replace(/[ْ]/g, '')

    // map remaining arabic characters according to transliterationDict
    for (let i = 0; i < text.length; i++) {
      const trigraph = text.slice(i, i + 3);
      const digraph = text.slice(i, i + 2);
      if (trigraphs[trigraph]) {
        result += trigraphs[trigraph][0];
        i += 2; // Skip the next two characters because we've already processed them as part of the trigraph
      } else if (digraphs[digraph]) {
        result += digraphs[digraph][0];
        i++; // Skip the next character because we've already processed it as part of the digraph
      } else if (chars[text[i]]) {
        result += chars[text[i]][0];
      } else {
        result += text[i];
      }
    }
    // console.log(result);
    return result;
  }

  function araRuby(arabicText: string, arabiziText: string): string {
    const arabicWords = arabicText.split(' ');
    const arabiziWords = arabiziText.split(' ');
    const style = `style="display: inline-flex; ruby-overhang: none; flex-direction: column; text-align: center; line-height: 1.2em;"`

    let result = '';
    for (let i = 0; i < arabicWords.length; i++) {
      if (!arabicWords[i].match(/[\u0621-\u064A]/)) result += arabicWords[i] + ' ';
      else result += `<span style="line-height: 1.6em;"><ruby ${style}> ${arabicWords[i]} <rp>(</rp><rt style="text-align: center">${arabiziWords[i]}</rt><rp>)</rp></ruby></span> `;
    }

    return result.trim();
  }

  console.log('Transliterating text nodes:', textNodes.length)
  const results: TextNode[] = [];
  textNodes.forEach(arabicText => {
    const arabiziText = transliterate(arabicText.text);
    results.push({ ...arabicText, text: araRuby(arabicText.text, arabiziText) });
  });

  return results;
}

// function transliterateTaMarbuta(sentence: string) {
//   // Regular expression to match Arabic words
//   const words = sentence.split(/\s+/);
//   const transliteratedWords = words.map(word => {
//     if (word.startsWith('ال')) return word;
//     else return word.replace(/ة([\u064B-\u0652]?)/g, (diacritic) => {
//       // Check if there's a diacritic indicating a suffix
//       if (diacritic && diacritic.match(/[\u064B-\u0652]/)) {
//         // Transliterated as 't' if there's a diacritic (indicative of suffix or definite article)
//         return 't';
//       } else {
//         // Transliterated as 'h' otherwise
//         return 'h';
//       }
//     });
//   });

//   // Join the transliterated words back into a sentence
//   return transliteratedWords.join(' ');
// }

// const chars: TransliterationDict = {
//   "ا": ["a", "aa", "e"],
//   "ب": ["b"],
//   "ت": ["t"],
//   "ث": ["th", "s"],
//   "ج": ["j", "g"],
//   "ح": ["H", "7", "h"],
//   "خ": ["kh", "5"],
//   "د": ["d"],
//   "ذ": ["dh", "th"],
//   "ر": ["r"],
//   "ز": ["z"],
//   "س": ["s"],
//   "ش": ["sh", "ch"],
//   "ص": ["S", "9"],
//   "ض": ["D", "9'"],
//   "ط": ["T", "6", "t"],
//   "ظ": ["DH", "6'", "dh"],
//   "ع": ["3", "a", "e"],
//   "غ": ["gh", "4", "3'"],
//   "ف": ["f"],
//   "ق": ["q", "8", "9"],
//   "ك": ["k"],
//   "ل": ["l"],
//   "م": ["m"],
//   "ن": ["n"],
//   "ه": ["h"],
//   "و": ["w", "uu", "o"],
//   "ي": ["y", "ii", "ee"],
//   "ء": ["2", "a", "e"],
//   "آ": ["2a", "aa", "2e"],
//   "ة": ["h", "at", "ah", "a"],
//   "ى": ["a", "aa", "e"],
//   "أ": ["2", "a", "e", "2a", "2e"],
//   "إ": ["2", "i", "e", "2e", "2i"],
//   "ؤ": ["2", "o", "u", "w"],
//   "ئ": ["2", "e", "y"],
//   "َ": ["a"],
//   "ِ": ["i"],
//   "ُ": ["u"],
//   "ً": ["an"],
//   "ٍ": ["in"],
//   "ٌ": ["un"],
//   "ْ": [""],
//   "ّ": [""],
//   "،": [","],
//   "؟": ["?"],
//   "؛": [";"]
// };

// const trigraphs: TransliterationDict = {
//   "َوْ": [
//     "aw"
//   ],
//   "َىْ": [
//     "ay"
//   ],
//   "َىّ": [
//     "ayy"
//   ]
// }

// const digraphs: TransliterationDict = {
//   "ده": [
//     "d'h"
//   ],
//   "ًا": [
//     "an"
//   ],
//   "َا": [
//     "aa"
//   ],
//   "ِى": [
//     "ii"
//   ],
//   "ُو": [
//     "uu"
//   ],
//   "َى": [
//     "a"
//   ],
//   "ِي": [
//     "ii"
//   ]
// }