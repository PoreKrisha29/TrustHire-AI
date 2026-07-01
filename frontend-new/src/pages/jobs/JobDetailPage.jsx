import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { jobsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import TrustScoreBadge from '@/components/trust/TrustScoreBadge'
import useAuthStore from '@/stores/auth.store'
import {
  MapPin, Clock, DollarSign, Building2, ChevronLeft,
  CheckCircle, AlertCircle, Loader2, Briefcase, Users,
  ShieldCheck, ExternalLink,
} from 'lucide-react'
import { formatSalary, timeAgo, APP_STATUS_CONFIG, cn } from '@/lib/utils'

export default function JobDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [coverLetter, setCoverLetter] = useState('')
  const [showApply, setShowApply] = useState(false)

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn:  () => jobsApi.get(id).then(r => r.data.data),
  })

  const applyMutation = useMutation({
    mutationFn: () => jobsApi.apply(id, { coverLetter }),
    onSuccess: () => {
      toast.success('Application submitted successfully!')
      setShowApply(false)
      queryClient.invalidateQueries(['job', id])
      queryClient.invalidateQueries(['candidate-dashboard'])
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Application failed'),
  })

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in">
        <div className="h-8 shimmer rounded w-40" />
        <div className="h-64 shimmer rounded-2xl" />
        <div className="h-96 shimmer rounded-2xl" />
      </div>
    )
  }

  if (!job) return <div className="text-center py-20 text-muted-foreground">Job not found</div>

  const hasApplied  = !!job.myApplication
  const myAppStatus = job.myApplication?.status
  const statusCfg   = myAppStatus ? APP_STATUS_CONFIG[myAppStatus] : null

  return (
    <div className="space-y-6 animate-in max-w-4xl">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
        <ChevronLeft className="w-4 h-4" /> Back to Jobs
      </Button>

      {/* Header card */}
      <Card>
        <CardContent className="p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground mb-2">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {job.employer?.companyName || 'Company'}
                  {job.employer?.verified && (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  )}
                </span>
                {job.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{job.location}</span>}
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />Posted {timeAgo(job.createdAt)}</span>
              </div>
            </div>
            <TrustScoreBadge score={job.trustScore} size="lg" />
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <Badge variant="secondary">{job.jobType?.replace('_', ' ')}</Badge>
            {(job.salaryMin || job.salaryMax) && (
              <Badge variant="outline" className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />{formatSalary(job.salaryMin, job.salaryMax)}
              </Badge>
            )}
            {job.matchScore && (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />{job.matchScore}% AI Match
              </Badge>
            )}
          </div>

          {/* Trust flags */}
          {job.trustFlags?.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
              <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-4 h-4" /> AI flagged the following concerns:
              </p>
              <ul className="space-y-1">
                {job.trustFlags.map((flag, i) => (
                  <li key={i} className="text-xs text-amber-300/80">• {flag.description}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Apply button / status */}
          {user?.role === 'CANDIDATE' && (
            hasApplied ? (
              <div className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border', statusCfg?.color)}>
                <CheckCircle className="w-4 h-4" />
                {statusCfg?.label || 'Applied'}
              </div>
            ) : showApply ? (
              <div className="space-y-3">
                <textarea
                  rows={4}
                  placeholder="Cover letter (optional) — tell the employer why you're a great fit…"
                  value={coverLetter}
                  onChange={e => setCoverLetter(e.target.value)}
                  className="w-full rounded-xl bg-input border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 resize-none"
                />
                <div className="flex gap-3">
                  <Button
                    onClick={() => applyMutation.mutate()}
                    disabled={applyMutation.isPending}
                  >
                    {applyMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : 'Submit Application'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowApply(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button onClick={() => setShowApply(true)} size="lg">
                  Apply Now <Briefcase className="w-4 h-4" />
                </Button>
                {job.employer?.website && (
                  <Button variant="outline" size="lg" asChild>
                    <a href={job.employer.website} target="_blank" rel="noopener noreferrer">
                      Company Site <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader><CardTitle>Job Description</CardTitle></CardHeader>
        <CardContent>
          <div className="prose prose-sm prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {job.description}
          </div>
        </CardContent>
      </Card>

      {/* Requirements */}
      {job.requirements && (
        <Card>
          <CardHeader><CardTitle>Requirements</CardTitle></CardHeader>
          <CardContent>
            <div className="prose prose-sm prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {job.requirements}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
