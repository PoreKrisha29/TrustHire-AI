/**
 * components/ProtectedRoute.jsx
 *
 * Route guard for DevPulse AI.
 * - No token  → redirect to /login
 * - Has token → render children (or <Outlet /> for nested routes)
 */

import { Navigate, Outlet } from 'react-router-dom'
import useAuthStore from '@/stores/authStore'

/**
 * @param {object} props
 * @param {React.ReactNode} [props.children]  — wrap a single component
 */
export default function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Supports both <ProtectedRoute><Page /></ProtectedRoute>
  // and <Route element={<ProtectedRoute />}> … </Route> (Outlet pattern)
  return children ?? <Outlet />
}
