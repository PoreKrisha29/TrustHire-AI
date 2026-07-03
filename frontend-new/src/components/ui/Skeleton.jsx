/**
 * components/ui/Skeleton.jsx
 *
 * Loading skeleton shimmer component.
 * Usage:
 *   <Skeleton h={16} w="100%" radius={8} mb={12} />
 *   <SkeletonCard />     — a pre-built card skeleton
 *   <SkeletonText n={3} /> — 3 lines of text skeletons
 */

// ── Base shimmer ──────────────────────────────────────────────────────────────
export function Skeleton({ h = 16, w = '100%', radius = 8, mb = 0, mt = 0 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: radius,
      marginBottom: mb, marginTop: mt,
      background:'rgba(255,255,255,0.06)',
      backgroundImage:'linear-gradient(90deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.04) 100%)',
      backgroundSize:'200% 100%',
      animation:'sk-shimmer 1.5s linear infinite',
    }}/>
  )
}

// ── Text block skeleton ───────────────────────────────────────────────────────
export function SkeletonText({ n = 3, last = '70%' }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} h={14} w={i === n - 1 ? last : '100%'}/>
      ))}
    </div>
  )
}

// ── Pre-built card skeleton ───────────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div style={{
      background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
      borderRadius:14, padding:20,
    }}>
      <style>{`@keyframes sk-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
      <Skeleton h={18} w="60%" mb={10}/>
      <SkeletonText n={2} last="80%"/>
      <div style={{ height:12 }}/>
      <div style={{ display:'flex', gap:6 }}>
        <Skeleton h={24} w={60} radius={99}/>
        <Skeleton h={24} w={50} radius={99}/>
        <Skeleton h={24} w={70} radius={99}/>
      </div>
    </div>
  )
}

// ── Stats grid skeleton ───────────────────────────────────────────────────────
export function SkeletonStatsGrid({ cols = 4 }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:12 }}>
      <style>{`@keyframes sk-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:16 }}>
          <Skeleton h={28} w="50%" mb={8}/>
          <Skeleton h={12} w="70%"/>
        </div>
      ))}
    </div>
  )
}

// ── Error state card ──────────────────────────────────────────────────────────
export function ErrorCard({ message = 'Something went wrong.', onRetry }) {
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:'48px 24px', textAlign:'center',
      background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.15)',
      borderRadius:14,
    }}>
      <span style={{ fontSize:36, marginBottom:12 }}>⚠️</span>
      <p style={{ fontSize:15, fontWeight:600, color:'#fca5a5', margin:'0 0 8px' }}>Something went wrong</p>
      <p style={{ fontSize:13, color:'#64748b', margin:'0 0 16px' }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding:'8px 20px', borderRadius:8,
            background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
            color:'#f87171', fontSize:13, fontWeight:600, cursor:'pointer',
            fontFamily:"'Inter',system-ui,sans-serif",
          }}
        >
          ↺ Retry
        </button>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title = 'Nothing here yet', desc = '', cta = null }) {
  return (
    <div style={{ textAlign:'center', padding:'60px 24px' }}>
      <p style={{ fontSize:48, margin:'0 0 12px' }}>{icon}</p>
      <p style={{ fontSize:16, fontWeight:600, color:'#e2e8f0', margin:'0 0 8px' }}>{title}</p>
      {desc && <p style={{ fontSize:13, color:'#475569', margin:'0 0 16px' }}>{desc}</p>}
      {cta}
    </div>
  )
}
