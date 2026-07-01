import { useState } from 'react'
import { toast } from 'sonner'
import useAuthStore from '@/stores/auth.store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Settings, Shield, Bell, Eye, Moon, Sun, Monitor,
  Loader2, Lock, Smartphone, RefreshCw, KeyRound
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)

  // Account settings state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Notification Preferences (State stored in LocalStorage)
  const [emailAlerts, setEmailAlerts] = useState(() => {
    return JSON.parse(localStorage.getItem('trusthire_settings_emails') ?? 'true')
  })
  const [smsAlerts, setSmsAlerts] = useState(() => {
    return JSON.parse(localStorage.getItem('trusthire_settings_sms') ?? 'false')
  })
  const [marketingAlerts, setMarketingAlerts] = useState(() => {
    return JSON.parse(localStorage.getItem('trusthire_settings_marketing') ?? 'true')
  })

  // Theme preference
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('trusthire_theme') || 'dark'
  })

  // Handle Notifications Save
  const saveNotifications = () => {
    localStorage.setItem('trusthire_settings_emails', JSON.stringify(emailAlerts))
    localStorage.setItem('trusthire_settings_sms', JSON.stringify(smsAlerts))
    localStorage.setItem('trusthire_settings_marketing', JSON.stringify(marketingAlerts))
    toast.success('Notification preferences updated!')
  }

  // Handle Theme Change
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme)
    localStorage.setItem('trusthire_theme', newTheme)
    toast.success(`Theme set to ${newTheme}!`)
  }

  // Handle Password Update
  const handlePasswordUpdate = (e) => {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    // Simulate updating password via Auth API
    setTimeout(() => {
      setLoading(false)
      toast.success('Password updated successfully! Next time, login with your new credentials.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }, 1500)
  }

  return (
    <div className="space-y-8 animate-in max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="w-8 h-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure security, notifications, and visual preferences
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Side: Security / Password Change */}
        <div className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Change Password
              </CardTitle>
              <CardDescription>Secure your account with a strong password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Current Password</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">New Password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Confirm New Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full mt-2">
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Updating...</>
                  ) : (
                    <><KeyRound className="w-4 h-4 mr-2" /> Update Password</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Session Information
              </CardTitle>
              <CardDescription>Current login session metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-border/30">
                <span className="text-muted-foreground">Logged in as</span>
                <span className="font-semibold text-foreground">{user?.email}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/30">
                <span className="text-muted-foreground">User Role</span>
                <span className="font-semibold text-primary capitalize">{user?.role?.toLowerCase()}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Authentication Method</span>
                <span className="font-semibold text-emerald-400">
                  {user?.googleId ? 'Google OAuth 2.0' : 'Email/Password'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Notifications & Preferences */}
        <div className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription>Control how and when you receive updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email alerts */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border/30">
                <div>
                  <p className="text-sm font-semibold">Email Alerts</p>
                  <p className="text-xs text-muted-foreground">Receive application updates and recommendations</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={e => setEmailAlerts(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-primary/40 cursor-pointer"
                />
              </div>

              {/* SMS alerts */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border/30">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    SMS Notifications
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">Beta</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Get instant text alerts when employers view your profile</p>
                </div>
                <input
                  type="checkbox"
                  checked={smsAlerts}
                  onChange={e => setSmsAlerts(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-primary/40 cursor-pointer"
                />
              </div>

              {/* Marketing alerts */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border/30">
                <div>
                  <p className="text-sm font-semibold">Newsletter & Offers</p>
                  <p className="text-xs text-muted-foreground">Receive periodic emails with job tips and platform news</p>
                </div>
                <input
                  type="checkbox"
                  checked={marketingAlerts}
                  onChange={e => setMarketingAlerts(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-primary/40 cursor-pointer"
                />
              </div>

              <Button onClick={saveNotifications} className="w-full mt-2" variant="secondary">
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sun className="w-5 h-5 text-primary" />
                Appearance
              </CardTitle>
              <CardDescription>Select the theme of the application interface</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'dark', label: 'Dark', icon: Moon },
                  { id: 'light', label: 'Light', icon: Sun },
                  { id: 'system', label: 'System', icon: Monitor }
                ].map(({ id, label, icon: Icon }) => {
                  const active = theme === id
                  return (
                    <button
                      key={id}
                      onClick={() => handleThemeChange(id)}
                      className={cn(
                        "p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-semibold transition-all duration-200",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-secondary/40"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
