import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Sparkles, Eye, EyeOff, Loader2 } from 'lucide-react'
import useAuthStore from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'

const schema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false)
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async ({ email, password }) => {
    const result = await login(email, password)
    if (result.success) {
      toast.success('Welcome back!')
      const role = useAuthStore.getState().user?.role
      navigate(role === 'EMPLOYER' ? '/employer/dashboard' : role === 'ADMIN' ? '/admin' : '/dashboard')
    } else {
      toast.error(result.error)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/api/auth/google`
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-violet-500/6 blur-[100px]" />
      </div>

      <div className="auth-card relative z-10 animate-slide-up">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your TrustHire account</p>
        </div>

        {/* Google OAuth button */}
        <button
          id="google-signin-btn"
          onClick={handleGoogleLogin}
          type="button"
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-200 text-sm font-medium text-foreground mb-5"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
            <path d="M47.532 24.552c0-1.636-.132-3.228-.388-4.776H24v9.026h13.207c-.57 3.064-2.3 5.66-4.9 7.4v6.148h7.928c4.64-4.272 7.297-10.568 7.297-17.798z" fill="#4285F4"/>
            <path d="M24 48c6.636 0 12.204-2.2 16.27-5.96l-7.928-6.148C30.152 37.38 27.26 38.4 24 38.4c-6.416 0-11.852-4.332-13.796-10.148H1.98v6.348C6.028 42.86 14.476 48 24 48z" fill="#34A853"/>
            <path d="M10.204 28.252A14.46 14.46 0 0 1 9.6 24c0-1.48.252-2.916.604-4.252v-6.348H1.98A23.944 23.944 0 0 0 0 24c0 3.86.928 7.516 2.58 10.748l7.624-6.496z" fill="#FBBC05"/>
            <path d="M24 9.6c3.62 0 6.868 1.244 9.428 3.676l7.06-7.064C36.2 2.196 30.632 0 24 0 14.476 0 6.028 5.14 1.98 13.252l8.224 6.496C12.148 13.932 17.584 9.6 24 9.6z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>

        {/* Divider */}
        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/8" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#1a1a24] px-3 text-muted-foreground">or sign in with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
          </div>

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-primary font-semibold hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  )
}
