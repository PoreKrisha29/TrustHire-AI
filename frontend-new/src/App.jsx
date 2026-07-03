import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

import useThemeStore   from '@/stores/theme.store'
import AuthGuard       from '@/components/auth/AuthGuard'
import DashboardLayout from '@/components/layout/DashboardLayout'
import useAuthStore    from '@/stores/authStore'

// ── DevPulse Auth ─────────────────────────────────────────────────────────────
import ProtectedRoute           from '@/components/ProtectedRoute'
import DevPulseLoginPage        from '@/pages/auth/DevPulseLoginPage'
import DevPulseRegisterPage     from '@/pages/auth/DevPulseRegisterPage'

// ── DevPulse Dashboard Layout ─────────────────────────────────────────────────
import DevPulseDashboardLayout  from '@/components/DevPulseDashboardLayout'

// ── DevPulse pages ────────────────────────────────────────────────────────────
import CareerDashboardPage  from '@/pages/dashboard/CareerDashboardPage'
import MyResumePage         from '@/pages/dashboard/MyResumePage'
import SkillGenomePage      from '@/pages/dashboard/SkillGenomePage'
import LearnCertifyPage     from '@/pages/dashboard/LearnCertifyPage'
import MockInterviewPage    from '@/pages/dashboard/MockInterviewPage'
import AICareerCoachPage    from '@/pages/dashboard/AICareerCoachPage'
import SkillBattlePage      from '@/pages/dashboard/SkillBattlePage'
import ProjectVaultPage     from '@/pages/dashboard/ProjectVaultPage'
import MarketPulsePage      from '@/pages/dashboard/MarketPulsePage'
import MyApplicationsPage   from '@/pages/dashboard/MyApplicationsPage'
import UserProfilePage      from '@/pages/dashboard/UserProfilePage'

// ── Public pages ───────────────────────────────────────────────────
import LandingPage            from '@/pages/LandingPage'
import DevPulseLandingPage    from '@/pages/DevPulseLandingPage'
import CertVerifyPage         from '@/pages/CertVerifyPage'

// ── Auth pages (legacy Node backend pages — kept intact) ──────────────────────
import LoginPage          from '@/pages/auth/LoginPage'
import RegisterPage       from '@/pages/auth/RegisterPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage  from '@/pages/auth/ResetPasswordPage'
import VerifyEmailPage    from '@/pages/auth/VerifyEmailPage'
import OAuthCallbackPage  from '@/pages/auth/OAuthCallbackPage'

// ── Legacy candidate pages ────────────────────────────────────────────────────
import DashboardPage  from '@/pages/dashboard/DashboardPage'
import JobsPage       from '@/pages/jobs/JobsPage'
import JobDetailPage  from '@/pages/jobs/JobDetailPage'
import ResumePage     from '@/pages/resume/ResumePage'
import AssistantPage  from '@/pages/assistant/AssistantPage'
import ProfilePage    from '@/pages/profile/ProfilePage'
import SettingsPage   from '@/pages/settings/SettingsPage'

// ── Legacy employer + admin pages ─────────────────────────────────────────────
import EmployerDashboard from '@/pages/employer/EmployerDashboard'
import PostJobPage       from '@/pages/employer/PostJobPage'
import AdminDashboard    from '@/pages/admin/AdminDashboard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            1000 * 60 * 2,
      retry:                1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  const applyTheme      = useThemeStore(s => s.applyTheme)
  const initFromStorage = useAuthStore(s => s.initFromStorage)

  useEffect(() => {
    applyTheme()
    initFromStorage()
  }, [applyTheme, initFromStorage])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>

          {/* ── Public ───────────────────────────────────────────────── */}
          <Route path="/" element={<DevPulseLandingPage />} />
          <Route path="/home-legacy" element={<LandingPage />} />
          <Route path="/cert/:cert_id" element={<CertVerifyPage />} />

          {/* ── DevPulse Auth ──────────────────────────────────────────── */}
          <Route path="/login"    element={<DevPulseLoginPage />} />
          <Route path="/register" element={<DevPulseRegisterPage />} />

          {/* ── DevPulse Dashboard (nested layout) ─────────────────────── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DevPulseDashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index                element={<CareerDashboardPage />} />
            <Route path="resume"        element={<MyResumePage />} />
            <Route path="genome"        element={<SkillGenomePage />} />
            <Route path="learn"         element={<LearnCertifyPage />} />
            <Route path="coach"         element={<AICareerCoachPage />} />
            <Route path="interview"     element={<MockInterviewPage />} />
            <Route path="battle"        element={<SkillBattlePage />} />
            <Route path="projects"      element={<ProjectVaultPage />} />
            <Route path="market"        element={<MarketPulsePage />} />
            <Route path="applications"  element={<MyApplicationsPage />} />
            <Route path="profile"       element={<UserProfilePage />} />
          </Route>

          {/* ── Legacy auth pages ──────────────────────────────────────── */}
          <Route path="/forgot-password" element={<AuthGuard requireAuth={false}><ForgotPasswordPage /></AuthGuard>} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />
          <Route path="/verify-email"    element={<VerifyEmailPage />} />
          <Route path="/auth/callback"   element={<OAuthCallbackPage />} />

          {/* ── Legacy candidate / employer / admin (old Node backend) ─── */}
          <Route element={<AuthGuard requireAuth={true}><DashboardLayout /></AuthGuard>}>
            <Route path="/jobs"         element={<JobsPage />} />
            <Route path="/jobs/:id"     element={<JobDetailPage />} />
            <Route path="/resume-old"   element={<AuthGuard allowedRoles={['CANDIDATE']}><ResumePage /></AuthGuard>} />
            <Route path="/ai-assistant" element={<AssistantPage />} />
            <Route path="/settings"     element={<SettingsPage />} />

            <Route path="/employer/dashboard"           element={<AuthGuard allowedRoles={['EMPLOYER']}><EmployerDashboard /></AuthGuard>} />
            <Route path="/employer/jobs/new"            element={<AuthGuard allowedRoles={['EMPLOYER']}><PostJobPage /></AuthGuard>} />
            <Route path="/employer/jobs/:id/applicants" element={<AuthGuard allowedRoles={['EMPLOYER']}><EmployerDashboard /></AuthGuard>} />

            <Route path="/admin"                element={<AuthGuard allowedRoles={['ADMIN']}><AdminDashboard /></AuthGuard>} />
            <Route path="/admin/quarantine"     element={<AuthGuard allowedRoles={['ADMIN']}><AdminDashboard /></AuthGuard>} />
            <Route path="/admin/verifications"  element={<AuthGuard allowedRoles={['ADMIN']}><AdminDashboard /></AuthGuard>} />
            <Route path="/admin/users"          element={<AuthGuard allowedRoles={['ADMIN']}><AdminDashboard /></AuthGuard>} />
            <Route path="/admin/audit"          element={<AuthGuard allowedRoles={['ADMIN']}><AdminDashboard /></AuthGuard>} />
          </Route>

          {/* ── Catch-all ──────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors theme="dark" position="top-right" />
    </QueryClientProvider>
  )
}
