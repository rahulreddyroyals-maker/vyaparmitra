// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { getUser, getBusiness } from '../lib/supabase'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [onboarded, setOnboarded] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const { data: userData } = await getUser(firebaseUser.uid)
        setUser({ ...firebaseUser, profile: userData })

        const { data: biz } = await getBusiness(firebaseUser.uid)
        if (biz) {
          setBusiness(biz)
          setOnboarded(true)
        }
      } else {
        setUser(null)
        setBusiness(null)
        setOnboarded(false)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  return (
    <AuthContext.Provider value={{ user, business, setBusiness, loading, onboarded, setOnboarded }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
