import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { jobsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, Loader2, Briefcase, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const schema = z.object({
  title:        z.string().min(3, 'Title must be at least 3 characters'),
  description:  z.string().min(100, 'Description must be at least 100 characters (AI requires this to compute trust score)'),
  requirements: z.string().optional(),
  jobType:      z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE']),
  location:     z.string().min(2, 'Location is required'),
  salaryMin:    z.coerce.number().min(0).optional(),
  salaryMax:    z.coerce.number().min(0).optional(),
  domain:       z.string().optional(),
})

const JOB_TYPES = [
  { value: 'FULL_TIME',  label: 'Full-time' },
  { value: 'PART_TIME',  label: 'Part-time' },
  { value: 'CONTRACT',   label: 'Contract' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'REMOTE',     label: 'Remote' },
]

export default function PostJobPage() {
  const navigate    = useNavigate()
  const queryClient = useQueryClient()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { jobType: 'FULL_TIME' },
  })

  const selectedType = watch('jobType')

  const mutation = useMutation({
    mutationFn: (data) => jobsApi.create(data),
    onSuccess: (res) => {
      toast.success('Job posted! AI Trust Score is being computed…')
      queryClient.invalidateQueries(['employer-dashboard'])
      queryClient.invalidateQueries(['jobs'])
      navigate('/employer/dashboard')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to post job'),
  })

  return (
    <div className="max-w-3xl space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Post a New Job</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Our AI will compute a Trust Score immediately after posting</p>
        </div>
      </div>

      {/* AI notice */}
      <div className="flex items-start gap-3 p-4 bg-primary/8 border border-primary/20 rounded-xl text-sm">
        <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-foreground">AI Trust Scoring</p>
          <p className="text-muted-foreground">Your listing will be scored by our AI engine (0–100). Listings scoring below 40 are quarantined for admin review. Provide a detailed description (100+ words) to get a higher score.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Job Details</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Job Title *</label>
              <Input placeholder="e.g. Senior React Developer" {...register('title')} />
              {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Job Type *</label>
              <div className="flex flex-wrap gap-2">
                {JOB_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue('jobType', value)}
                    className={cn(
                      'text-sm px-4 py-2 rounded-xl border font-medium transition-all',
                      selectedType === value
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : 'border-border text-muted-foreground hover:border-border/80'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Location *</label>
              <Input placeholder="e.g. Bangalore, Karnataka / Remote" {...register('location')} />
              {errors.location && <p className="text-xs text-destructive mt-1">{errors.location.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Min Salary (₹/year)</label>
                <Input type="number" placeholder="e.g. 600000" {...register('salaryMin')} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Max Salary (₹/year)</label>
                <Input type="number" placeholder="e.g. 1200000" {...register('salaryMax')} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Company Domain (for AI verification)</label>
              <Input placeholder="e.g. acmecorp.com" {...register('domain')} />
              <p className="text-xs text-muted-foreground mt-1">Used to verify company domain existence (DNS + HTTP check)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job Description *</CardTitle>
            <CardDescription>Minimum 100 words required for AI Trust Score computation</CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              rows={8}
              placeholder="Describe the role, responsibilities, your team, tech stack, perks, and growth opportunities…"
              className="w-full rounded-xl bg-input border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 resize-none"
              {...register('description')}
            />
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Requirements</CardTitle></CardHeader>
          <CardContent>
            <textarea
              rows={5}
              placeholder="List qualifications, skills, years of experience, and any certifications required…"
              className="w-full rounded-xl bg-input border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 resize-none"
              {...register('requirements')}
            />
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={mutation.isPending} size="lg">
            {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Posting…</> : <><Briefcase className="w-4 h-4" />Post Job</>}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
