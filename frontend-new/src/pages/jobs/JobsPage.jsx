import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { jobsApi } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import TrustScoreBadge from '@/components/trust/TrustScoreBadge'
import {
  Search, MapPin, Clock, DollarSign, Filter,
  Building2, ArrowRight, Briefcase, SlidersHorizontal,
} from 'lucide-react'
import { formatSalary, timeAgo, truncate, cn } from '@/lib/utils'

const JOB_TYPES   = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE']
const JOB_TYPE_LABELS = { FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract', INTERNSHIP: 'Internship', REMOTE: 'Remote' }

function JobCard({ job }) {
  return (
    <Link to={`/jobs/${job.id}`}>
      <Card className="hover:border-primary/40 transition-all duration-300 group cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {job.title}
              </h3>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{job.companyName || 'Company'}</span>
                {job.employer?.verified && (
                  <Badge variant="success" className="text-[10px] px-1.5 py-0">Verified</Badge>
                )}
              </div>
            </div>
            <TrustScoreBadge score={job.trustScore} size="sm" />
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
            {truncate(job.description, 140)}
          </p>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {job.location && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
            )}
            {(job.salaryMin || job.salaryMax) && (
              <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{formatSalary(job.salaryMin, job.salaryMax)}</span>
            )}
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(job.createdAt)}</span>
            <Badge variant="secondary" className="text-[10px]">{JOB_TYPE_LABELS[job.jobType] || job.jobType}</Badge>
            {job.matchScore && (
              <span className="ml-auto text-primary font-semibold">{job.matchScore}% match</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function JobsPage() {
  const [search, setSearch]   = useState('')
  const [jobType, setJobType] = useState('')
  const [minTrust, setMinTrust] = useState('')
  const [page, setPage]       = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', { search, jobType, minTrust, page }],
    queryFn:  () => jobsApi.list({ search, jobType, minTrust: minTrust || undefined, page, limit: 12 }).then(r => r.data.data),
    keepPreviousData: true,
  })

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Browse Jobs</h1>
        <p className="text-muted-foreground mt-1">All listings AI-verified with Trust Scores</p>
      </div>

      {/* Search + filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs, companies, skills…"
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => setShowFilters(v => !v)}>
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-3 pt-2 border-t border-border/50 animate-in">
              {/* Job type */}
              <div className="flex flex-wrap gap-1.5">
                {JOB_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => { setJobType(jobType === t ? '' : t); setPage(1) }}
                    className={cn(
                      'text-xs px-3 py-1.5 rounded-full border font-medium transition-all',
                      jobType === t
                        ? 'bg-primary/15 border-primary/30 text-primary'
                        : 'border-border text-muted-foreground hover:border-border/80'
                    )}
                  >
                    {JOB_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>

              {/* Min trust score */}
              <div className="flex items-center gap-2 ml-auto">
                <label className="text-xs text-muted-foreground whitespace-nowrap">Min Trust:</label>
                <select
                  value={minTrust}
                  onChange={e => { setMinTrust(e.target.value); setPage(1) }}
                  className="text-xs bg-input border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
                >
                  <option value="">Any</option>
                  <option value="70">70+ (High)</option>
                  <option value="50">50+ (Medium)</option>
                  <option value="40">40+ (Active)</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{data ? `${data.total} jobs found` : 'Loading…'}</span>
        {data?.total > 0 && <span>Page {page} of {data?.totalPages}</span>}
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 shimmer rounded-2xl" />
          ))}
        </div>
      ) : !data?.items?.length ? (
        <div className="text-center py-20 text-muted-foreground">
          <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-medium">No jobs found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            {data.items.map(job => <JobCard key={job.id} job={job} />)}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {data.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
