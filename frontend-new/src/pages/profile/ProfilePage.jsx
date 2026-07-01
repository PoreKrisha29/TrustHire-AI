import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { candidatesApi, employersApi } from '@/lib/api'
import useAuthStore from '@/stores/auth.store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  User, Building2, MapPin, Briefcase, Award, Globe, Users,
  Upload, Loader2, Save, Eye, EyeOff, Plus, X, CheckCircle, ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProfilePage() {
  const { user, fetchMe } = useAuthStore()
  const queryClient = useQueryClient()
  const isCandidate = user?.role === 'CANDIDATE'
  const isEmployer = user?.role === 'EMPLOYER'

  // Fetch role-specific profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      if (isCandidate) {
        const res = await candidatesApi.getProfile()
        return res.data.data
      } else if (isEmployer) {
        const res = await employersApi.getProfile()
        return res.data.data
      }
      return null
    },
    enabled: !!user,
  })

  // State for Candidate Profile
  const [candName, setCandName] = useState('')
  const [candTitle, setCandTitle] = useState('')
  const [candLoc, setCandLoc] = useState('')
  const [candExp, setCandExp] = useState('')
  const [candVisibility, setCandVisibility] = useState('PUBLIC')
  const [candSkills, setCandSkills] = useState([])
  const [newSkill, setNewSkill] = useState('')
  const [candJobTypes, setCandJobTypes] = useState([])

  // State for Employer Profile
  const [empName, setEmpName] = useState('')
  const [empWeb, setEmpWeb] = useState('')
  const [empInd, setEmpInd] = useState('')
  const [empSize, setEmpSize] = useState('')
  const [empLoc, setEmpLoc] = useState('')
  const [empDesc, setEmpDesc] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)

  // Initialize form states when profile loads
  useEffect(() => {
    if (profile) {
      if (isCandidate) {
        setCandName(profile.fullName || '')
        setCandTitle(profile.jobTitle || '')
        setCandLoc(profile.location || '')
        setCandExp(profile.yearsExperience != null ? String(profile.yearsExperience) : '')
        setCandVisibility(profile.visibility || 'PUBLIC')
        setCandSkills(profile.skills || [])
        setCandJobTypes(profile.preferredJobTypes || [])
      } else if (isEmployer) {
        setEmpName(profile.companyName || '')
        setEmpWeb(profile.website || '')
        setEmpInd(profile.industry || '')
        setEmpSize(profile.companySize || '')
        setEmpLoc(profile.location || '')
        setEmpDesc(profile.description || '')
      }
    }
  }, [profile, isCandidate, isEmployer])

  // Mutation for updating profile
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      if (isCandidate) {
        return candidatesApi.updateProfile(data)
      } else if (isEmployer) {
        return employersApi.updateProfile(data)
      }
    },
    onSuccess: () => {
      toast.success('Profile updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      queryClient.invalidateQueries({ queryKey: ['candidate-dashboard'] })
      fetchMe() // sync store user role/metadata if needed
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update profile')
    }
  })

  // Handle Candidate Save
  const handleCandidateSave = (e) => {
    e.preventDefault()
    if (!candName.trim()) {
      toast.error('Full Name is required')
      return
    }
    updateMutation.mutate({
      fullName: candName,
      jobTitle: candTitle || null,
      location: candLoc || null,
      yearsExperience: candExp ? parseInt(candExp, 10) : null,
      visibility: candVisibility,
      skills: candSkills,
      preferredJobTypes: candJobTypes
    })
  }

  // Handle Employer Save
  const handleEmployerSave = (e) => {
    e.preventDefault()
    if (!empName.trim()) {
      toast.error('Company Name is required')
      return
    }
    updateMutation.mutate({
      companyName: empName,
      website: empWeb || null,
      industry: empInd || null,
      companySize: empSize || null,
      location: empLoc || null,
      description: empDesc || null
    })
  }

  // Handle Logo Upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }
    setLogoUploading(true)
    try {
      await employersApi.uploadLogo(file)
      toast.success('Logo uploaded successfully!')
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Logo upload failed')
    } finally {
      setLogoUploading(false)
    }
  }

  // Handle Skills Tag Add
  const addSkill = (e) => {
    e.preventDefault()
    const trimmed = newSkill.trim()
    if (!trimmed) return
    if (candSkills.includes(trimmed)) {
      toast.error('Skill already added')
      return
    }
    if (candSkills.length >= 30) {
      toast.error('Maximum 30 skills allowed')
      return
    }
    setCandSkills([...candSkills, trimmed])
    setNewSkill('')
  }

  // Handle Skills Tag Remove
  const removeSkill = (skillToRemove) => {
    setCandSkills(candSkills.filter(s => s !== skillToRemove))
  }

  // Toggle Preferred Job Type
  const toggleJobType = (type) => {
    if (candJobTypes.includes(type)) {
      setCandJobTypes(candJobTypes.filter(t => t !== type))
    } else {
      setCandJobTypes([...candJobTypes, type])
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Loading profile data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          {isCandidate ? <User className="w-8 h-8 text-primary" /> : <Building2 className="w-8 h-8 text-primary" />}
          {isCandidate ? 'My Profile' : 'Company Profile'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isCandidate ? 'Manage your professional details and preferences' : 'Configure your company identity and listing settings'}
        </p>
      </div>

      {/* Profile Overview Header Card */}
      <Card className="overflow-hidden relative border border-border/50">
        <div className="h-28 bg-gradient-to-r from-primary/20 via-violet-500/10 to-transparent" />
        <CardContent className="p-6 relative -mt-8 flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-4 text-center md:text-left">
            {isCandidate ? (
              <div className="w-20 h-20 rounded-full bg-primary/20 border-4 border-card text-primary font-bold text-2xl flex items-center justify-center shadow-lg shrink-0">
                {candName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
              </div>
            ) : (
              <div className="relative group shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-secondary/80 border-4 border-card flex items-center justify-center overflow-hidden shadow-lg">
                  {profile?.logoUrl ? (
                    <img src={profile.logoUrl.startsWith('http') ? profile.logoUrl : `/api/files/${profile.logoUrl}`} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-10 h-10 text-muted-foreground" />
                  )}
                  {logoUploading && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 bg-primary text-white p-1.5 rounded-full cursor-pointer hover:bg-primary/90 shadow-md">
                  <Upload className="w-3.5 h-3.5" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                </label>
              </div>
            )}

            <div>
              <h2 className="text-2xl font-bold flex items-center justify-center md:justify-start gap-1.5">
                {isCandidate ? candName || 'Candidate Name' : empName || 'Company Name'}
                {isEmployer && profile?.verified && (
                  <ShieldCheck className="w-5 h-5 text-emerald-400 fill-emerald-400/10" />
                )}
              </h2>
              <p className="text-muted-foreground text-sm flex items-center justify-center md:justify-start gap-1.5 mt-0.5">
                {isCandidate ? (
                  <>
                    <Briefcase className="w-3.5 h-3.5" />
                    {candTitle || 'Add your job title'}
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    {empInd || 'Add industry'}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Completeness Badge or Verified Badge */}
          {isCandidate && (
            <div className="flex flex-col items-center md:items-end gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">Profile Completeness</span>
              <Badge variant="secondary" className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 text-sm font-bold">
                {profile?.completenessScore ?? 0}% Complete
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Candidate Form */}
      {isCandidate && (
        <form onSubmit={handleCandidateSave} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left section - Basic info */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
                <CardDescription>Primary identification details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                  <Input value={candName} onChange={e => setCandName(e.target.value)} placeholder="e.g. Rahul Sharma" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Job Title</label>
                  <Input value={candTitle} onChange={e => setCandTitle(e.target.value)} placeholder="e.g. Senior Software Engineer" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Location</label>
                    <Input value={candLoc} onChange={e => setCandLoc(e.target.value)} placeholder="e.g. Bangalore, India" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Experience (Years)</label>
                    <Input type="number" min="0" max="60" value={candExp} onChange={e => setCandExp(e.target.value)} placeholder="e.g. 5" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Profile Visibility</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setCandVisibility('PUBLIC')}
                      className={cn(
                        "flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200",
                        candVisibility === 'PUBLIC'
                          ? "border-primary bg-primary/10 text-primary shadow"
                          : "border-border hover:bg-secondary/40 text-muted-foreground"
                      )}
                    >
                      <Eye className="w-4 h-4" /> Public (Visible to Employers)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCandVisibility('PRIVATE')}
                      className={cn(
                        "flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200",
                        candVisibility === 'PRIVATE'
                          ? "border-primary bg-primary/10 text-primary shadow"
                          : "border-border hover:bg-secondary/40 text-muted-foreground"
                      )}
                    >
                      <EyeOff className="w-4 h-4" /> Private (Apply Only)
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right section - Skills & Preferences */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Skills & Job Preferences</CardTitle>
                <CardDescription>Configure tags and preferred job types</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Skills tags */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Skills</label>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={e => setNewSkill(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(e); } }}
                      placeholder="e.g. React"
                    />
                    <Button type="button" onClick={addSkill} size="icon" variant="secondary" className="shrink-0">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1 min-h-[3rem] p-2 bg-secondary/20 rounded-xl border border-border/40">
                    {candSkills.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic p-1">No skills added yet...</span>
                    ) : (
                      candSkills.map((s, i) => (
                        <Badge key={i} variant="secondary" className="flex items-center gap-1 bg-secondary text-foreground hover:bg-secondary/80">
                          {s}
                          <X className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => removeSkill(s)} />
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                {/* Job Types */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Preferred Job Types</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['FULL_TIME', 'PART_TIME', 'REMOTE', 'CONTRACT'].map((type) => {
                      const active = candJobTypes.includes(type)
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleJobType(type)}
                          className={cn(
                            "p-2.5 rounded-lg border text-xs font-semibold transition-all duration-200",
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:bg-secondary/40"
                          )}
                        >
                          {type.replace('_', ' ')}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={updateMutation.isPending} className="px-6">
              {updateMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save Changes</>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Employer Form */}
      {isEmployer && (
        <form onSubmit={handleEmployerSave} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left section - Company Details */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Company Info</CardTitle>
                <CardDescription>Primary company identity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Company Name</label>
                  <Input value={empName} onChange={e => setEmpName(e.target.value)} placeholder="e.g. Acme Corp" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Website URL</label>
                  <Input value={empWeb} onChange={e => setEmpWeb(e.target.value)} placeholder="e.g. https://acme.org" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Industry</label>
                    <Input value={empInd} onChange={e => setEmpInd(e.target.value)} placeholder="e.g. Software" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Company Size</label>
                    <select
                      value={empSize}
                      onChange={e => setEmpSize(e.target.value)}
                      className="w-full bg-input border border-border/80 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    >
                      <option value="">Select size</option>
                      <option value="1-10">1-10 Employees</option>
                      <option value="11-50">11-50 Employees</option>
                      <option value="51-200">51-200 Employees</option>
                      <option value="201-500">201-500 Employees</option>
                      <option value="500+">500+ Employees</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">HQ Location</label>
                  <Input value={empLoc} onChange={e => setEmpLoc(e.target.value)} placeholder="e.g. San Francisco, CA" />
                </div>
              </CardContent>
            </Card>

            {/* Right section - About Company */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
                <CardDescription>Tell candidates about your company</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">About the Company</label>
                  <textarea
                    value={empDesc}
                    onChange={e => setEmpDesc(e.target.value)}
                    rows="8"
                    placeholder="Describe your company culture, mission, and what you build..."
                    className="w-full bg-input border border-border/80 rounded-xl p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-muted-foreground resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={updateMutation.isPending} className="px-6">
              {updateMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save Changes</>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
