/**
 * /auth/callback — handles redirect from Google OAuth
 *
 * After a successful Google login, the backend redirects here with:
 *   ?accessToken=xxx&refreshToken=xxx&role=CANDIDATE|EMPLOYER|ADMIN
 *
 * This page:
 *  1. Reads tokens from URL params
 *  2. Stores them via the auth store
 *  3. Redirects to the correct dashboard
 *  4. Shows an error state if OAuth failed
 */
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import useAuthStore from '@/stores/auth.store'
import { authApi } from '@/lib/api'

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const accessToken  = searchParams.get('accessToken')
    const refreshToken = searchParams.get('refreshToken')
    const role         = searchParams.get('role')
    const err          = searchParams.get('error')

    if (err) {
      const messages = {
        oauth_not_configured: 'Google OAuth is not yet configured on this server.',
        oauth_failed:         'Google login failed. Please try again or use email/password.',
      }
      setError(messages[err] || 'An unexpected error occurred during Google login.')
      setTimeout(() => navigate('/login'), 3500)
      return
    }

    if (!accessToken || !refreshToken) {
      setError('Missing authentication tokens. Redirecting to login…')
      setTimeout(() => navigate('/login'), 2500)
      return
    }

    // Store tokens
    localStorage.setItem('accessToken',  accessToken)
    localStorage.setItem('refreshToken', refreshToken)

    // Fetch full user profile then redirect
    authApi.me()
      .then(({ data }) => {
        const user = data.data
        useAuthStore.setState({ user, accessToken, refreshToken, isLoading: false })
        const dest =
          user.role === 'EMPLOYER' ? '/employer/dashboard' :
          user.role === 'ADMIN'    ? '/admin' :
          '/dashboard'
        navigate(dest, { replace: true })
      })
      .catch(() => {
        setError('Could not fetch your profile. Please log in again.')
        setTimeout(() => navigate('/login'), 2500)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-violet-500/6 blur-[100px]" />
      </div>

      <div className="auth-card text-center relative z-10 animate-slide-up">
        {error ? (
          <>
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Sign-in failed</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground mt-3">Redirecting you back to login…</p>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Signing you in…</h2>
            <p className="text-sm text-muted-foreground">Setting up your TrustHire account via Google</p>
          </>
        )}
      </div>
    </div>
  )
}
