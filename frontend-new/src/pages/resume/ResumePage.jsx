import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { candidatesApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Upload, FileText, CheckCircle, AlertCircle, Loader2,
  TrendingUp, Target, Lightbulb, Search, Zap, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function ScoreRing({ score, size = 96, label }) {
  const r = (size / 2) - 8
  const circ = 2 * Math.PI * r
  const fill = circ - (circ * (score ?? 0)) / 100
  const colour = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <circle
            cx={size/2} cy={size/2} r={r}
            fill="none" stroke={colour} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={fill}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-foreground">{score ?? '—'}</span>
          <span className="text-[10px] text-muted-foreground">/100</span>
        </div>
      </div>
      {label && <p className="text-xs text-muted-foreground font-medium">{label}</p>}
    </div>
  )
}

export default function ResumePage() {
  const fileRef = useRef()
  const [uploading, setUploading] = useState(false)
  const [expanded, setExpanded] = useState({})

  const { data: analysis, isLoading, refetch } = useQuery({
    queryKey: ['resume-analysis'],
    queryFn:  () => candidatesApi.getAnalysis().then(r => r.data.data),
  })

  const latest = Array.isArray(analysis) ? analysis[0] : analysis  // most recent report

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return }

    setUploading(true)
    try {
      await candidatesApi.uploadResume(file)
      toast.success('Resume uploaded! AI analysis is running — check back in 30 seconds.')
      setTimeout(refetch, 35000)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-8 animate-in max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold">Resume Analyzer</h1>
        <p className="text-muted-foreground mt-1">Get AI-powered feedback on your resume to maximize interview chances</p>
      </div>

      {/* Upload card */}
      <Card className="border-2 border-dashed border-border/60 hover:border-primary/40 transition-colors">
        <CardContent className="p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Upload className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Upload Your Resume</h3>
          <p className="text-sm text-muted-foreground mb-6">PDF or DOCX — max 5MB. AI will score and analyze in ~30 seconds.</p>
          <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleUpload} />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</> : <><Upload className="w-4 h-4" />Choose File</>}
          </Button>
          <p className="text-xs text-muted-foreground mt-4">Limited to 3 reports. Oldest is removed when you upload a 4th.</p>
        </CardContent>
      </Card>

      {/* Analysis report */}
      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-36 shimmer rounded-2xl" />)}
        </div>
      ) : !latest ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>No analysis yet — upload your resume above to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Score overview */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Report</CardTitle>
              <CardDescription>
                Analyzed on {new Date(latest.analyzed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                {latest.target_role && ` · Target: ${latest.target_role}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-center gap-8 py-4">
                <ScoreRing score={latest.overall_score} size={120} label="Overall" />
                <ScoreRing score={latest.ats_score}     size={96}  label="ATS Score" />
                {latest.breakdown && Object.entries(latest.breakdown).map(([key, val]) => (
                  <ScoreRing key={key} score={val} size={80} label={key.charAt(0).toUpperCase() + key.slice(1)} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Strengths & Weaknesses */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-emerald-400"><CheckCircle className="w-5 h-5" />Strengths</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {latest.strengths?.length ? latest.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{s}</span>
                    </li>
                  )) : <li className="text-sm text-muted-foreground">No specific strengths flagged</li>}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-amber-400"><AlertCircle className="w-5 h-5" />Areas to Improve</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {latest.weaknesses?.length ? latest.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{w}</span>
                    </li>
                  )) : <li className="text-sm text-muted-foreground">None identified</li>}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Missing keywords */}
          {latest.missing_keywords?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Search className="w-5 h-5 text-blue-400" />Missing Keywords</CardTitle>
                <CardDescription>These keywords from your target role are missing from your resume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {latest.missing_keywords.map((kw, i) => (
                    <Badge key={i} variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-500/10">{kw}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gemini suggestions */}
          {latest.suggestions?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  AI Improvement Suggestions
                </CardTitle>
                <CardDescription>Powered by Gemini — prioritized from most to least impactful</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {latest.suggestions.sort((a,b) => (a.priority||0) - (b.priority||0)).map((s, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-secondary/40 border border-border/50">
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {s.priority || i + 1}
                      </span>
                      <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Integrity flags */}
          {latest.integrity_flags?.length > 0 && (
            <Card className="border-red-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-400"><AlertCircle className="w-5 h-5" />Integrity Flags</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {latest.integrity_flags.map((f, i) => (
                    <li key={i} className="text-sm text-red-400/80">⚠ {f}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
