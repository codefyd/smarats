import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null) // 'super_admin' | 'org_admin' | null
  const [orgId, setOrgId] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadRole(userId) {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role, organization_id')
      .eq('user_id', userId)
      .order('role', { ascending: true }) // super_admin يأتي أولاً لو موجود
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('loadRole error:', error)
      return
    }
    if (data) {
      setRole(data.role)
      setOrgId(data.organization_id)
    } else {
      setRole(null)
      setOrgId(null)
    }
  }

  useEffect(() => {
    // جلسة ابتدائية
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadRole(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // استماع لتغيرات الجلسة
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadRole(session.user.id)
      } else {
        setRole(null)
        setOrgId(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, role, orgId, loading, signIn, signUp, signOut, reloadRole: () => user && loadRole(user.id) }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
