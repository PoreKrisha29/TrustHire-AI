import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

import useThemeStore   from '@/stores/theme.store'
import AuthGuard       from '@/components/auth/AuthGuard'
import DashboardLayout from '@/components/layout/DashboardLayout'

// Pages — Public / Auth
import LandingPage        from '@/pages/LandingPage'
import LoginPage          from '@/pages/auth/LoginPage'
import RegisterPage       from '@/pages/auth/RegisterPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage  from '@/pages/auth/ResetPasswordPage'
import VerifyEmailPage    from '@/pages/auth/VerifyEmailPage'
import OAuthCallbackPage  from '@/pages/auth/OAuthCallbackPage'

// Pages — Candidate
import DashboardPage  from '@/pages/dashboard/DashboardPage'
import JobsPage       from '@/pages/jobs/JobsPage'
import JobDetailPage  from '@/pages/jobs/JobDetailPage'
import ResumePage     from '@/pages/resume/ResumePage'
import AssistantPage  from '@/pages/assistant/AssistantPage'
import ProfilePage    from '@/pages/profile/ProfilePage'
import SettingsPage   from '@/pages/settings/SettingsPage'


// Pages — Employer
import EmployerDashboard from '@/pages/employer/EmployerDashboard'
import PostJobPage       from '@/pages/employer/PostJobPage'

// Pages — Admin
import AdminDashboard from '@/pages/admin/AdminDashboard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:  1000 * 60 * 2,  // 2 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  const theme = useThemeStore((state) => state.theme)
  const applyTheme = useThemeStore((state) => state.applyTheme)

  useEffect(() => {
    applyTheme()
  }, [applyTheme])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* ── Public routes ───────────────────────────────────── */}
          <Route path="/" element={<LandingPage />} />

          {/* Auth pages (redirect to dashboard if already logged in) */}
          <Route path="/login"          element={<AuthGuard requireAuth={false}><LoginPage /></AuthGuard>} />
          <Route path="/register"       element={<AuthGuard requireAuth={false}><RegisterPage /></AuthGuard>} />
          <Route path="/forgot-password" element={<AuthGuard requireAuth={false}><ForgotPasswordPage /></AuthGuard>} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />
          <Route path="/verify-email"    element={<VerifyEmailPage />} />

          {/* Google OAuth callback — no auth guard, handles its own redirect */}
          <Route path="/auth/callback"   element={<OAuthCallbackPage />} />

          {/* ── Protected routes (inside DashboardLayout) ───────── */}
          <Route element={<AuthGuard requireAuth={true}><DashboardLayout /></AuthGuard>}>

            {/* Candidate routes */}
            <Route path="/dashboard"    element={<AuthGuard allowedRoles={['CANDIDATE']}><DashboardPage /></AuthGuard>} />
            <Route path="/jobs"         element={<JobsPage />} />
            <Route path="/jobs/:id"     element={<JobDetailPage />} />
            <Route path="/resume"       element={<AuthGuard allowedRoles={['CANDIDATE']}><ResumePage /></AuthGuard>} />
            <Route path="/ai-assistant" element={<AssistantPage />} />
            <Route path="/applications" element={<AuthGuard allowedRoles={['CANDIDATE']}><DashboardPage /></AuthGuard>} />
            <Route path="/profile"      element={<ProfilePage />} />
            <Route path="/settings"     element={<SettingsPage />} />


            {/* Employer routes */}
            <Route path="/employer/dashboard"            element={<AuthGuard allowedRoles={['EMPLOYER']}><EmployerDashboard /></AuthGuard>} />
            <Route path="/employer/jobs/new"             element={<AuthGuard allowedRoles={['EMPLOYER']}><PostJobPage /></AuthGuard>} />
            <Route path="/employer/jobs/:id/applicants"  element={<AuthGuard allowedRoles={['EMPLOYER']}><EmployerDashboard /></AuthGuard>} />
            <Route path="/company/verify"                element={<AuthGuard allowedRoles={['EMPLOYER']}><EmployerDashboard /></AuthGuard>} />

            {/* Admin routes */}
            <Route path="/admin"                element={<AuthGuard allowedRoles={['ADMIN']}><AdminDashboard /></AuthGuard>} />
            <Route path="/admin/quarantine"     element={<AuthGuard allowedRoles={['ADMIN']}><AdminDashboard /></AuthGuard>} />
            <Route path="/admin/verifications"  element={<AuthGuard allowedRoles={['ADMIN']}><AdminDashboard /></AuthGuard>} />
            <Route path="/admin/users"          element={<AuthGuard allowedRoles={['ADMIN']}><AdminDashboard /></AuthGuard>} />
            <Route path="/admin/audit"          element={<AuthGuard allowedRoles={['ADMIN']}><AdminDashboard /></AuthGuard>} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors theme={theme} position="top-right" />
    </QueryClientProvider>
  )
}
