import React, { createContext, useContext, useMemo } from 'react';
import { Language, TranslationSchema } from './types';
import { vi } from './vi';
import { en } from './en';

export * from './types';
export { vi } from './vi';
export { en } from './en';

export const translations: Record<Language, TranslationSchema> = {
  vi,
  en,
};

export type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<TranslationSchema>;

export function getNestedValue(obj: any, path: string): string {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return path;
    }
  }
  return typeof current === 'string' ? current : path;
}

export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{${key}}`;
  });
}

export function translate(
  lang: Language,
  key: TranslationKey | string,
  params?: Record<string, string | number>
): string {
  const dict = translations[lang] || translations.vi;
  const raw = getNestedValue(dict, key);
  return interpolate(raw, params);
}

/**
 * Reads the persisted UI language safely from localStorage (usable outside React components).
 */
export function getStoredLanguage(): Language {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('bookmd_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.language === 'en') return 'en';
      }
    }
  } catch {
    // ignore storage errors
  }
  return 'vi';
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey | string, params?: Record<string, string | number>) => string;
  translations: TranslationSchema;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'vi',
  setLanguage: () => {},
  t: (key, params) => translate('vi', key, params),
  translations: vi,
});

export const LanguageProvider: React.FC<{
  language: Language;
  onLanguageChange: (lang: Language) => void;
  children: React.ReactNode;
}> = ({ language, onLanguageChange, children }) => {
  const value: LanguageContextType = useMemo(() => {
    const activeLang: Language = language === 'en' ? 'en' : 'vi';
    return {
      language: activeLang,
      setLanguage: onLanguageChange,
      t: (key: TranslationKey | string, params?: Record<string, string | number>) =>
        translate(activeLang, key, params),
      translations: translations[activeLang],
    };
  }, [language, onLanguageChange]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useTranslation() {
  return useContext(LanguageContext);
}
