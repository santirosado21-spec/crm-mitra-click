import { useState } from 'react'
import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { setStoredLang, getStoredLang, type AppLang } from '../../i18n'

// Toggle EN/ES — persiste en localStorage. Vive en el Header.
export function LanguageToggle() {
  const { i18n } = useTranslation()
  const [lang, setLang] = useState<AppLang>(getStoredLang())

  const pick = (next: AppLang) => {
    setLang(next)
    setStoredLang(next)
  }

  // i18n referenciado para mantener el componente reactivo al cambio.
  void i18n.language

  return (
    <div
      className="hidden sm:inline-flex items-center rounded-lg border border-gray-200 overflow-hidden"
      title="Idioma / Language"
    >
      <Languages size={14} className="text-gray-400 ml-2 mr-1" aria-hidden="true" />
      {(['es', 'en'] as AppLang[]).map(code => (
        <button
          key={code}
          type="button"
          onClick={() => pick(code)}
          className={`px-2 py-1 text-[11px] font-bold uppercase transition-colors ${
            lang === code ? 'text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}
          style={lang === code ? { background: 'var(--brand-navy)' } : undefined}
        >
          {code}
        </button>
      ))}
    </div>
  )
}
