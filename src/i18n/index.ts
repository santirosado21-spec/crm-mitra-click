// i18n — soporte EN/ES para el TMS de paquetería (Techship replica).
// Idioma por defecto: español. Persiste la elección en localStorage.

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './es.json'
import en from './en.json'

export type AppLang = 'es' | 'en'

const STORAGE_KEY = 'crm-lang'

export function getStoredLang(): AppLang {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  return v === 'en' ? 'en' : 'es'
}

export function setStoredLang(lang: AppLang) {
  try { localStorage.setItem(STORAGE_KEY, lang) } catch { /* no-op */ }
  i18n.changeLanguage(lang)
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    lng: getStoredLang(),
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
  })

export default i18n
