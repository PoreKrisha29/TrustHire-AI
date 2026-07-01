import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Briefcase, FileText, User, MessageSquare,
  Building2, ListChecks, ShieldCheck, Settings, LogOut,
  ChevronRight, Sparkles, Sun, Moon,
} from 'lucide-react'
import useAuthStore from '@/stores/auth.store'
import useThemeStore from '@/stores/theme.store'
import { cn } from '@/lib/utils'

const candidateNav = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/jobs',          icon: Briefcase,       label: 'Browse Jobs' },
  { to: '/applications',  icon: ListChecks,      label: 'Applications' },
  { to: '/resume',        icon: FileText,        label: 'Resume Analyzer' },
  { to: '/ai-assistant',  icon: MessageSquare,   label: 'AI Assistant', badge: 'AI' },
  { to: '/profile',       icon: User,            label: 'Profile' },
  { to: '/settings',      icon: Settings,        label: 'Settings' },
]

const employerNav = [
  { to: '/employer/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/jobs',               icon: Briefcase,       label: 'Job Board' },
  { to: '/employer/jobs/new',  icon: Briefcase,       label: 'Post a Job', badge: '+' },
  { to: '/company/verify',     icon: ShieldCheck,     label: 'Verification' },
  { to: '/profile',            icon: Building2,       label: 'Company Profile' },
  { to: '/settings',           icon: Settings,        label: 'Settings' },
]

const adminNav = [
  { to: '/admin',              icon: LayoutDashboard, label: 'Overview' },
  { to: '/admin/quarantine',   icon: ShieldCheck,     label: 'Quarantine Queue' },
  { to: '/admin/verifications',icon: Building2,       label: 'Verifications' },
  { to: '/admin/users',        icon: User,            label: 'Users' },
  { to: '/admin/audit',        icon: ListChecks,      label: 'Audit Log' },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  const navItems =
    user?.role === 'EMPLOYER' ? employerNav :
    user?.role === 'ADMIN'    ? adminNav    :
    candidateNav

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="fixed inset-y-0 left-0 sidebar-width flex flex-col bg-card border-r border-border/50 z-40">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border/50">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm text-foreground leading-none">TrustHire AI</p>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{user?.role?.toLowerCase()}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn('nav-item', isActive && 'active')}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 truncate">{label}</span>
            {badge && (
              <span className="text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User card + logout */}
      <div className="px-3 py-4 border-t border-border/50">
        <button
          onClick={toggleTheme}
          className="nav-item w-full mb-2"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="flex-1 text-left">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="flex-1 text-left">Dark Mode</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/40 transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="nav-item w-full mt-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
