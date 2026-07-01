import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { employersApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import TrustScoreBadge from '@/components/trust/TrustScoreBadge'
import {
  Briefcase, Users, TrendingUp, ShieldCheck,
  Plus, ArrowRight, Eye, Clock,
} from 'lucide-react'
import { timeAgo, cn } from '@/lib/utils'

const STATUS_CONFIG = {
  ACTIVE:      { label: 'Active',      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  DRAFT:       { label: 'Draft',       className: 'bg-muted text-muted-foreground border-border' },
  QUARANTINED: { label: 'Quarantined', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
  CLOSED:      { label: 'Closed',      className: 'bg-muted text-muted-foreground border-border' },
}

export default function EmployerDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['employer-dashboard'],
    queryFn:  () => employersApi.getDashboard().then(r => r.data.data),
  })

  const stats = [
    { label: 'Active Listings', value: data?.activeListings,     icon: Briefcase, color: 'bg-primary/10 text-primary' },
    { label: 'Total Applicants',value: data?.totalApplicants,    icon: Users,     color: 'bg-blue-500/10 text-blue-400' },
    { label: 'Avg Trust Score', value: data?.avgTrustScore,      icon: TrendingUp,color: 'bg-emerald-500/10 text-emerald-400' },
    { label: 'Company Verified',value: data?.isVerified ? '✓' : '—', icon: ShieldCheck, color: 'bg-amber-500/10 text-amber-400' },
  ]

  return (
    <div className="space-y-8 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employer Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your job listings and applicants</p>
        </div>
        <Button asChild>
          <Link to="/employer/jobs/new"><Plus className="w-4 h-4" />Post a Job</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-6">
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-3xl font-bold mb-1">{isLoading ? <span className="shimmer rounded w-8 h-7 inline-block" /> : (value ?? 0)}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Company verification CTA */}
      {!data?.isVerified && !isLoading && (
        <Card className="border-amber-500/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Verify Your Company</p>
              <p className="text-sm text-muted-foreground">Verified companies get a trust badge and +10 boost to all Trust Scores</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/company/verify">Verify now <ArrowRight className="w-3.5 h-3.5" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Listings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Job Listings</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/employer/jobs/new"><Plus className="w-4 h-4" />New listing</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-14 shimmer rounded-xl" />)}
            </div>
          ) : !data?.listings?.length ? (
            <div className="p-12 text-center text-muted-foreground">
              <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No listings yet</p>
              <Button size="sm" className="mt-3" asChild>
                <Link to="/employer/jobs/new">Post your first job</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {data.listings.map(listing => {
                const statusCfg = STATUS_CONFIG[listing.status] || {}
                return (
                  <div key={listing.id} className="flex items-center justify-between px-6 py-4 hover:bg-secondary/20 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{listing.title}</p>
                        <Badge className={cn('border text-[10px]', statusCfg.className)}>{statusCfg.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{listing.applicantCount || 0} applicants</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(listing.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <TrustScoreBadge score={listing.trustScore} size="sm" showLabel={false} />
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/employer/jobs/${listing.id}/applicants`}><Eye className="w-3.5 h-3.5" />View</Link>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
