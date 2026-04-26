import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null) // 'super_admin' | 'org_admin' | null
  const [orgId, setOrgId] = useState(null)
  const [org, setOrg] = useState(null)            // بيانات الجهة الكاملة
  const [subscription, setSubscription] = useState(null) // { status, end_date, days_remaining }
  const [loading, setLoading] = useState(true)

  const loadOrgAndSubscription = useCallback(async (orgIdToLoad) => {
    if (!orgIdToLoad) {
      setOrg(null)
      setSubscription(null)
      return
    }

    try {
      const [{ data: orgData }, { data: subData }] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', orgIdToLoad).single(),
        supabase.rpc('get_subscription_status', { _org_id: orgIdToLoad }).maybeSingle()
      ])

      setOrg(orgData || null)
      setSubscription(subData || null)
    } catch (err) {
      console.error('loadOrgAndSubscription error:', err)
    }
  }, [])

  const loadRole = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role, organization_id')
      .eq('user_id', userId)
      .order('role', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('loadRole error:', error)
      return
    }

    if (data) {
      setRole(data.role)
      setOrgId(data.organization_id)
      await loadOrgAndSubscription(data.organization_id)
    } else {
      setRole(null)
      setOrgId(null)
      setOrg(null)
      setSubscription(null)
    }
  }, [loadOrgAndSubscription])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadRole(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadRole(session.user.id)
      } else {
        setRole(null)
        setOrgId(null)
        setOrg(null)
        setSubscription(null)
      }
    })

    return () => authSub.unsubscribe()
  }, [loadRole])

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

  // تُستدعى بعد أي تحديث على بيانات الجهة (مثلاً تجديد اشتراك)
  const refreshOrg = useCallback(async () => {
    if (orgId) await loadOrgAndSubscription(orgId)
  }, [orgId, loadOrgAndSubscription])

  // المساعدات المحسوبة
  const canEdit = (() => {
    if (role === 'super_admin') return true
    if (!org) return false
    if (org.status !== 'active') return false
    if (!subscription) return false
    return subscription.status === 'active' || subscription.status === 'expiring_soon'
  })()

  return (
    <AuthContext.Provider value={{
      user,
      role,
      orgId,
      org,
      subscription,
      loading,
      canEdit,
      signIn,
      signUp,
      signOut,
      refreshOrg,
      reloadRole: () => user && loadRole(user.id)
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
