import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { adminApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import TrustScoreBadge from '@/components/trust/TrustScoreBadge'
import { Link } from 'react-router-dom'
import {
  Users, Briefcase, ShieldCheck, AlertTriangle,
  CheckCircle, XCircle, RotateCcw, ArrowRight, Activity,
} from 'lucide-react'
import { timeAgo, cn } from '@/lib/utils'

export default function AdminDashboard() {
  const queryClient = useQueryClient()

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn:  () => adminApi.getStats().then(r => r.data.data),
    refetchInterval: 60000,
  })

  const { data: quarantine } = useQuery({
    queryKey: ['admin-quarantine'],
    queryFn:  () => adminApi.getQuarantine({ limit: 5 }).then(r => r.data.data),
  })

  const { data: verifications } = useQuery({
    queryKey: ['admin-verifications'],
    queryFn:  () => adminApi.getVerifications({ limit: 5 }).then(r => r.data.data),
  })

  const quarantineMutation = useMutation({
    mutationFn: ({ jobId, action }) => adminApi.actOnQuarantine(jobId, { action }),
    onSuccess: () => {
      toast.success('Action applied')
      queryClient.invalidateQueries(['admin-quarantine'])
      queryClient.invalidateQueries(['admin-stats'])
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Action failed'),
  })

  const verifyMutation = useMutation({
    mutationFn: ({ id, action, notes }) => adminApi.actOnVerification(id, { action, notes }),
    onSuccess: () => {
      toast.success('Verification updated')
      queryClient.invalidateQueries(['admin-verifications'])
      queryClient.invalidateQueries(['admin-stats'])
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Action failed'),
  })

  const statCards = [
    { label: 'Total Users',          value: stats?.totalUsers,           icon: Users,          color: 'bg-primary/10 text-primary' },
    { label: 'Active Jobs',          value: stats?.activeJobs,           icon: Briefcase,      color: 'bg-emerald-500/10 text-emerald-400' },
    { label: 'Quarantined',          value: stats?.quarantinedJobs,      icon: AlertTriangle,  color: 'bg-red-500/10 text-red-400' },
    { label: 'Pending Verifications',value: stats?.pendingVerifications, icon: ShieldCheck,    color: 'bg-amber-500/10 text-amber-400' },
  ]

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="w-7 h-7 text-primary" />
          Admin Overview
        </h1>
        <p className="text-muted-foreground mt-1">Monitor trust scores, verifications, and platform health</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-6">
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-3xl font-bold mb-1">{value ?? <span className="shimmer rounded w-10 h-7 inline-block" />}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quarantine queue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Quarantine Queue
          </CardTitle>
          <Badge variant="destructive">{stats?.quarantinedJobs ?? 0}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {!quarantine?.items?.length ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-60" />
              <p className="text-sm">Queue is clear 🎉</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {quarantine.items.map(job => (
                <div key={job.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <p className="font-medium text-sm">{job.title}</p>
                      <p className="text-xs text-muted-foreground">{job.companyName} · {timeAgo(job.createdAt)}</p>
                    </div>
                    <TrustScoreBadge score={job.trustScore} size="sm" />
                  </div>
                  {job.trustFlags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {job.trustFlags.slice(0,3).map((f,i) => (
                        <Badge key={i} variant="destructive" className="text-[10px]">{f.signal}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      onClick={() => quarantineMutation.mutate({ jobId: job.id, action: 'APPROVE' })}>
                      <CheckCircle className="w-3.5 h-3.5" />Approve
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={() => quarantineMutation.mutate({ jobId: job.id, action: 'REMOVE' })}>
                      <XCircle className="w-3.5 h-3.5" />Remove
                    </Button>
                    <Button size="sm" variant="ghost"
                      onClick={() => quarantineMutation.mutate({ jobId: job.id, action: 'REQUEST_RESUBMIT' })}>
                      <RotateCcw className="w-3.5 h-3.5" />Request Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification queue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            Pending Verifications
          </CardTitle>
          <Badge variant="warning">{stats?.pendingVerifications ?? 0}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {!verifications?.items?.length ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-60" />
              No pending verifications
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {verifications.items.map(v => (
                <div key={v.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="font-medium text-sm">{v.companyName}</p>
                      <p className="text-xs text-muted-foreground">
                        Reg: {v.registrationNumber || '—'} · Submitted {timeAgo(v.createdAt)}
                      </p>
                    </div>
                    <Badge variant="warning" className="text-xs">PENDING</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      onClick={() => verifyMutation.mutate({ id: v.id, action: 'APPROVE' })}>
                      <CheckCircle className="w-3.5 h-3.5" />Approve
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={() => {
                        const notes = prompt('Reason for rejection (required):')
                        if (notes) verifyMutation.mutate({ id: v.id, action: 'REJECT', notes })
                      }}>
                      <XCircle className="w-3.5 h-3.5" />Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
