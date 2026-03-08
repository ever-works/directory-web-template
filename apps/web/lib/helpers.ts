export type LanguageCode = "en" | "fr" | "es" | "zh" | "de" | "ar" | "he" | "ru" | "uk" | "pt" | "it" | "ja" | "ko" | "nl" | "pl" | "tr" | "vi" | "th" | "hi" | "id" | "bg";

export type LanguageCountryCode = {
  [key in LanguageCode]: string;
};

export const LANGUAGE_COUNTRY_CODES: LanguageCountryCode = {
  en: "US",
  fr: "FR",
  es: "ES",
  zh: "CN",
  de: "DE",
  ar: "SA",
  he: "IL",
  ru: "RU",
  uk: "UA",
  pt: "BR",
  it: "IT",
  ja: "JP",
  ko: "KR",
  nl: "NL",
  pl: "PL",
  tr: "TR",
  vi: "VN",
  th: "TH",
  hi: "IN",
  id: "ID",
  bg: "BG"
};

export const appLocales = [...Object.keys(LANGUAGE_COUNTRY_CODES)];

export function getCountryCode(languageCode: LanguageCode = "en"): string {
  return LANGUAGE_COUNTRY_CODES[languageCode as LanguageCode];
}