import arabizi from '../../public/arabizi.json';

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
        // parse definite article
        // alParse(arabicText)
        
        return arabicText  
          // remove sukoon
          .replace(/[ْ]/g, '') 
          
          // replace all cases of shadda with previous letter
          .replace(/([\u0621-\u064A])([\u064B-\u0652]*)(\u0651)/g, '$1$1$2') 
          
          // map remaining arabic characters according to transliterationDict
          .split('')
          .map(char => transliterationDict[char]?.[0] || char)
          .join('')

          // might want to post-parse weird vowel clusters as a kludge
      } else {return ''}
      
    });
  }

// TODO: identify al-, add dash
// TODO: sun/moon transformation: al-Sudan == as-Sudan
// (maybe this should be an optional flag)

// TODO: joined vowels -- fii instead of fiy, etc
// e.g. 'arabiyya

// TODO: punctuation (add in arabizi.json)

