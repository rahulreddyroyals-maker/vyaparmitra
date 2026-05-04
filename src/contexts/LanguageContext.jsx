// src/contexts/LanguageContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { translations, getLang, setLang } from '../lib/translations'

const LanguageContext = createContext(null)

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(getLang())

  const switchLang = (newLang) => {
    setLang(newLang)
    setLangState(newLang)
  }

  const t = (key) => {
    return translations[lang]?.[key] || translations['en']?.[key] || key
  }

  return (
    <LanguageContext.Provider value={{ lang, switchLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext)
