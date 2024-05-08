export type Languages = 'en' | 'ar';

type Translations = {
  [key: string]: {
    [lang in Languages]: string;
  };
};

export const translations: Translations = {
  settings: {
    en: "Settings",
    ar: "الإعدادات"
  },
  easyPeasyArabizi: {
    en: "Easy Peasy Arabizi",
    ar: "عرابيزي سهل جدًا!"
  },
  arabizi: {
    en: "Arabizi",
    ar: "عربيزي"
  },
  original: {
    en: "Original",
    ar: "نص ساذج"
  },
  tashkil: {
    en: "+Vowels",
    ar: "نص مشكول"
  },
  // Add translations for other text items
};