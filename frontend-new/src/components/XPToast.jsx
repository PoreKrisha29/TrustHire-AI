/**
 * components/XPToast.jsx
 *
 * Global XP gain floating chip toast.
 * Usage: showXPToast(200, '⚡') — shows a "+200 XP ⚡" chip that fades in from the bottom and disappears after 2s.
 *
 * Mount <XPToastContainer/> once in your app root (or DevPulseDashboardLayout).
 * Call showXPToast() from anywhere (it's global state via a simple pub/sub).
 */

import { useState, useEffect, useCallback } from 'react'

// Simple event bus (no Zustand needed)
const _listeners = new Set()

export function showXPToast(amount, icon = '⚡') {
  _listeners.forEach(fn => fn(amount, icon))
}

let _toastId = 0

export function XPToastContainer() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((amount, icon) => {
    const id = ++_toastId
    setToasts(prev => [...prev, { id, amount, icon }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2200)
  }, [])

  useEffect(() => {
    _listeners.add(addToast)
    return () => _listeners.delete(addToast)
  }, [addToast])

  return (
    <div style={{
      position:'fixed', bottom:80, right:24, zIndex:9999,
      display:'flex', flexDirection:'column-reverse', gap:8, pointerEvents:'none',
    }}>
      <style>{`
        @keyframes xp-slidein { from{opacity:0;transform:translateY(16px) scale(0.9)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes xp-fadeout { to{opacity:0;transform:translateY(-8px) scale(0.95)} }
      `}</style>
      {toasts.map((t, i) => (
        <div
          key={t.id}
          style={{
            display:'inline-flex', alignItems:'center', gap:8,
            background:'rgba(10,14,26,0.96)',
            border:'1px solid rgba(99,102,241,0.5)',
            borderRadius:99, padding:'8px 18px',
            boxShadow:'0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(99,102,241,0.3)',
            animation: `xp-slidein 0.3s ease-out, xp-fadeout 0.3s ease-in ${i === toasts.length-1 ? '1.9' : (1.9 - i*0.1)}s forwards`,
            fontFamily:"'Inter',system-ui,sans-serif",
          }}
        >
          <span style={{ fontSize:16 }}>{t.icon}</span>
          <span style={{
            fontSize:14, fontWeight:800,
            background:'linear-gradient(90deg,#818cf8,#a5b4fc)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
          }}>
            +{t.amount} XP
          </span>
        </div>
      ))}
    </div>
  )
}
