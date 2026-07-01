import { Navigate } from 'react-router-dom'
import useAuthStore from '@/stores/auth.store'

/**
 * Redirects unauthenticated users to /login.
 * Redirects authenticated users away from auth pages.
 */
export default function AuthGuard({ children, requireAuth = true, allowedRoles = [] }) {
  const { user, accessToken } = useAuthStore()
  const isAuthenticated = !!accessToken

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!requireAuth && isAuthenticated) {
    // Already logged in, redirect to appropriate dashboard
    const dest =
      user?.role === 'EMPLOYER' ? '/employer/dashboard' :
      user?.role === 'ADMIN'    ? '/admin'              :
      '/dashboard'
    return <Navigate to={dest} replace />
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
