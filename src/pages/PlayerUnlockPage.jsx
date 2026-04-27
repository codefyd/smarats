import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PlayerUnlockPage() {
  const { publicId } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: rpcErr } = await supabase.rpc('verify_screen_password', {
        _public_id: publicId,
        _password: password
      })
      if (rpcErr) throw rpcErr

      if (data === true) {
        const storage = remember ? localStorage : sessionStorage
        storage.setItem(`smarats_unlock_${publicId}`, '1')
        navigate(`/s/${publicId}`)
      } else {
        setError('كلمة السر غير صحيحة')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="player-root flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="bg-white/5 backdrop-blur rounded-2xl p-6 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-xl font-bold mb-1">شاشة محمية</h1>
          <p className="text-sm opacity-70">أدخل كلمة السر للمتابعة</p>
        </div>

        <input
          type="password"
          required
          autoFocus
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 mb-3 focus:outline-none focus:border-white/40"
          placeholder="••••••••"
          dir="ltr"
        />

        <label className="flex items-center gap-2 text-sm mb-4 opacity-80">
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
          <span>تذكر على هذه الشاشة (لن يُطلب منك بعد الإطفاء)</span>
        </label>

        {error && <div className="mb-4 p-3 bg-red-500/20 text-red-200 rounded-lg text-sm text-center">{error}</div>}

        <button type="submit" disabled={loading} className="w-full py-3 bg-white text-black rounded-lg font-bold disabled:opacity-50">
          {loading ? 'جاري التحقق...' : 'فتح'}
        </button>
      </form>
    </div>
  )
}
