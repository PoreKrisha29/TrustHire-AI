import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Loader2, CheckCircle, AlertCircle, Sparkles } from 'lucide-react'
import { authApi } from '@/lib/api'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('')
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No verification token found in this link. Please check your email again.')
      return
    }

    authApi.verifyEmail(token)
      .then(() => {
        setStatus('success')
        setMessage('Your email has been verified! You can now sign in.')
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.response?.data?.message || 'This verification link has expired or is invalid. Please request a new one.')
      })
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-violet-500/6 blur-[100px]" />
      </div>

      <div className="auth-card text-center relative z-10 animate-slide-up">
        {/* Brand */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
        </div>

        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Verifying your email…</h1>
            <p className="text-sm text-muted-foreground">This will only take a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Email verified! ✓</h1>
            <p className="text-sm text-muted-foreground mb-6">{message}</p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Sign in to TrustHire
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Verification failed</h1>
            <p className="text-sm text-muted-foreground mb-6">{message}</p>
            <div className="flex flex-col gap-3">
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Go to sign in
              </Link>
              <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Request a new verification link
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
