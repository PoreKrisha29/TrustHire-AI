import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Get trust score level and styling class
 */
export function getTrustLevel(score) {
  if (score === null || score === undefined) return { level: 'unknown', label: 'Pending', className: 'text-muted-foreground bg-muted border-border' }
  if (score >= 70) return { level: 'high',   label: 'High Trust',   className: 'trust-high' }
  if (score >= 40) return { level: 'medium', label: 'Medium Trust', className: 'trust-medium' }
  return                { level: 'low',    label: 'Low Trust',    className: 'trust-low' }
}

/**
 * Format salary range as a readable string (INR)
 */
export function formatSalary(min, max) {
  const fmt = (n) => n >= 100000
    ? `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`
    : `₹${(n / 1000).toFixed(0)}K`
  if (!min && !max) return 'Salary not disclosed'
  if (!max) return `${fmt(min)}+`
  if (!min) return `Up to ${fmt(max)}`
  return `${fmt(min)} – ${fmt(max)}`
}

/**
 * Truncate text to maxLength with ellipsis
 */
export function truncate(str, maxLength = 120) {
  if (!str) return ''
  return str.length > maxLength ? str.slice(0, maxLength) + '…' : str
}

/**
 * Format relative time (e.g. "2 days ago")
 */
export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)  return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Application status display config
 */
export const APP_STATUS_CONFIG = {
  APPLIED:             { label: 'Applied',             color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  SHORTLISTED:         { label: 'Shortlisted',         color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  INTERVIEW_SCHEDULED: { label: 'Interview Scheduled', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  HIRED:               { label: 'Hired 🎉',            color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  REJECTED:            { label: 'Not Selected',        color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  WITHDRAWN:           { label: 'Withdrawn',           color: 'text-muted-foreground bg-muted border-border' },
}
