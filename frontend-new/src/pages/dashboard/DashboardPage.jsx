import { useQuery } from '@tanstack/react-query'
import { candidatesApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import TrustScoreBadge from '@/components/trust/TrustScoreBadge'
import { Link } from 'react-router-dom'
import {
  Briefcase, TrendingUp, FileText, Sparkles,
  ArrowRight, Clock, CheckCircle, Target,
} from 'lucide-react'
import { APP_STATUS_CONFIG, timeAgo, cn } from '@/lib/utils'

function StatCard({ icon: Icon, label, value, color, to }) {
  const card = (
    <Card className="hover:border-primary/30 transition-all duration-300 group">
      <CardContent className="p-6">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-3xl font-bold text-foreground mb-1">{value ?? <span className="shimmer rounded w-8 h-7 inline-block" />}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
  return to ? <Link to={to}>{card}</Link> : card
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['candidate-dashboard'],
    queryFn:  () => candidatesApi.getDashboard().then((r) => r.data.data),
  })

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Your career journey at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Target}  label="Profile Complete" color="bg-primary/10 text-primary"
          value={data ? `${data.profileCompleteness}%` : null}
          to="/profile"
        />
        <StatCard
          icon={Briefcase}  label="Total Applications" color="bg-blue-500/10 text-blue-400"
          value={data?.totalApplications}
          to="/applications"
        />
        <StatCard
          icon={TrendingUp}  label="New Jobs This Week" color="bg-emerald-500/10 text-emerald-400"
          value={data?.newJobsThisWeek}
          to="/jobs"
        />
        <StatCard
          icon={FileText}  label="Resume Score" color="bg-violet-500/10 text-violet-400"
          value={data?.resumeScore != null ? `${data.resumeScore}/100` : '—'}
          to="/resume"
        />
      </div>

      {/* Profile completeness bar */}
      {data && data.profileCompleteness < 100 && (
        <Card className="border-amber-500/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Complete your profile to unlock better matches</p>
                <span className="text-sm font-bold text-amber-400">{data.profileCompleteness}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-700"
                  style={{ width: `${data.profileCompleteness}%` }}
                />
              </div>
            </div>
            <Button size="sm" asChild>
              <Link to="/profile">Complete <ArrowRight className="w-3.5 h-3.5" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent applications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Applications</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/applications">View all <ArrowRight className="w-3.5 h-3.5" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-12 shimmer rounded-xl" />)}
            </div>
          ) : !data?.recentApplications?.length ? (
            <div className="p-12 text-center text-muted-foreground">
              <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No applications yet</p>
              <Button size="sm" className="mt-3" asChild>
                <Link to="/jobs">Browse Jobs</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {data.recentApplications.map((app) => {
                const statusCfg = APP_STATUS_CONFIG[app.status] || {}
                return (
                  <div key={app.id} className="flex items-center justify-between px-6 py-4 hover:bg-secondary/20 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{app.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground">{app.companyName}</p>
                        <span className="text-muted-foreground/40">•</span>
                        <p className="text-xs text-muted-foreground">{timeAgo(app.appliedAt)}</p>
                      </div>
                    </div>
                    <Badge className={cn('ml-4 border text-xs', statusCfg.color)}>
                      {statusCfg.label}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { to: '/jobs',         icon: Briefcase,    label: 'Browse Jobs',         desc: 'Find verified opportunities' },
          { to: '/resume',       icon: FileText,     label: 'Analyze Resume',      desc: 'Get AI-powered feedback' },
          { to: '/ai-assistant', icon: Sparkles,     label: 'Ask AI Assistant',    desc: 'Career advice powered by Gemini' },
        ].map(({ to, icon: Icon, label, desc }) => (
          <Link key={to} to={to}>
            <Card className="h-full hover:border-primary/30 transition-all duration-300 group cursor-pointer">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform duration-200" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
