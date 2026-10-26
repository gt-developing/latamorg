import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)

const anonymous = { loading: false, user: null, roles: [], isAdmin: false, isSubadmin: false, permissions: { publishGuides: [], manageEvents: [] } }

// Dirección que inicia el login con Discord y vuelve a la página indicada.
export const loginUrl = (next = '/') => `/api/auth/login?next=${encodeURIComponent(next)}`

export function AuthProvider({ children }) {
  const [state, setState] = useState({ ...anonymous, loading: true })

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { credentials: 'same-origin' })
      if (!res.ok) throw new Error('sin sesión')
      const data = await res.json()
      setState({
        loading: false,
        user: data.user ?? null,
        roles: data.roles ?? [],
        isAdmin: Boolean(data.isAdmin),
        isSubadmin: Boolean(data.isSubadmin),
        permissions: data.permissions ?? { publishGuides: [], manageEvents: [] },
      })
    } catch {
      // Sin backend (por ejemplo con `npm run dev` a secas) el sitio funciona como visitante.
      setState(anonymous)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    } catch {
      /* si falla igual dejamos la sesión local limpia */
    }
    setState(anonymous)
  }, [])

  const value = useMemo(() => ({ ...state, refresh, logout }), [state, refresh, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return context
}
