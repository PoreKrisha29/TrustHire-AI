import { cn, getTrustLevel } from '@/lib/utils'
import { ShieldCheck, ShieldAlert, Shield, Loader2 } from 'lucide-react'

/**
 * Trust Score Badge
 * Shows a coloured pill with the trust score and an icon.
 * When score is null (processing), shows a pulsing shimmer.
 */
export default function TrustScoreBadge({ score, size = 'md', showLabel = true, className }) {
  const { level, label, className: colorClass } = getTrustLevel(score)

  const sizes = {
    sm:  'text-xs px-2 py-0.5 gap-1',
    md:  'text-sm px-3 py-1 gap-1.5',
    lg:  'text-base px-4 py-1.5 gap-2',
  }

  if (score === null || score === undefined) {
    return (
      <span className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold',
        'text-muted-foreground bg-muted border-border animate-pulse-slow',
        sizes[size], className
      )}>
        <Loader2 className="w-3 h-3 animate-spin" />
        Computing…
      </span>
    )
  }

  const Icon = level === 'high' ? ShieldCheck : level === 'medium' ? Shield : ShieldAlert

  return (
    <span className={cn(
      'inline-flex items-center rounded-full border font-semibold font-mono',
      colorClass, sizes[size], className
    )}>
      <Icon className={cn('shrink-0', size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
      <span>{score}</span>
      {showLabel && (
        <span className={cn('font-normal not-italic', size === 'sm' ? 'text-xs' : 'text-xs opacity-80')}>
          {label}
        </span>
      )}
    </span>
  )
}
