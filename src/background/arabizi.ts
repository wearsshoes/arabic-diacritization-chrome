import { TextNode } from '../common/webpageDataClass';
import transliterations from './transliterations.json';

interface TransliterationDict {
  [key: string]: string[];
}

export function arabicToArabizi(textNodes: TextNode[], dialect: string = "msa"): TextNode[] {

  let chars: TransliterationDict;
  let digraphs: TransliterationDict;
  switch (dialect) {
    case "msa":
      chars = transliterations['ala-lc'].chars
      digraphs = transliterations['ala-lc'].digraphs
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
      // alif waslah
      .replace(/(?<=[^\u0621-\u0652])آ(?=[\u0621-\u0652])/g, 'ā')
      // hamza
      .replace(/(?<=[^\u0621-\u0652])[ءأإ](?=[\u0621-\u0652])/g, '')

      // handle arabic characters at end of word
      // defective root shadda iyy ending
      .replace(/(?<=[\u0621-\u0652])ِيّ(?=[^\u0621-\u0652])/g, 'ī')
      .replace(/(?<=[\u0621-\u0652])ُوّ(?=[^\u0621-\u0652])/g, 'ūw')
      .replace(/(?<=[\u0621-\u0652])َوّ(?=[^\u0621-\u0652])/g, 'aww')
      .replace(/(?<=[\u0621-\u0652])وا(?=[^\u0621-\u0652])/g, 'u')

      // handle middle of word

      // replace all other cases of shadda with previous letter
      .replace(/([\u0621-\u064A])([\u064B-\u0652]*)(\u0651)/g, '$1$1$2')

      // remove remaining sukoon
      .replace(/[ْ]/g, '')

    // map remaining arabic characters according to transliterationDict
    for (let i = 0; i < text.length; i++) {
      const digraph = text[i] + text[i + 1];
      if (digraphs[digraph]) {
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

// TODO: joined vowels -- fii instead of fiy, etc
// e.g. 'arabiyyat
// y and w at beginning of word
// al- works sometimes and not other times in a weird and inconsistent way; maybe different unicode pts?
// al gets dash only if near beginning of word (define a list of prefixes...?)
// treat Allah special


// TODO: punctuation (add in arabizi.json)

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