import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ShieldCheck, Sparkles, TrendingUp, Users, Briefcase,
  ArrowRight, Star, ChevronRight, Zap, Brain, Lock,
  Sun, Moon,
} from 'lucide-react'
import useThemeStore from '@/stores/theme.store'

const STATS = [
  { value: '50K+', label: 'Verified Jobs' },
  { value: '98%',  label: 'Scam Detection' },
  { value: '10K+', label: 'Happy Hires' },
  { value: '4.9★', label: 'User Rating' },
]

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'AI Trust Score',
    description: 'Every job is rated 0–100 by our AI engine. Red flags like fake salaries, ghost domains, and spam patterns are flagged instantly.',
    color: 'text-emerald-400',
    bg:    'bg-emerald-500/10',
  },
  {
    icon: Brain,
    title: 'SBERT Matching',
    description: 'Semantic AI matching pairs your skills, experience, and preferences against 384-dimensional job embeddings — not just keywords.',
    color: 'text-violet-400',
    bg:    'bg-violet-500/10',
  },
  {
    icon: Sparkles,
    title: 'Resume Analyzer',
    description: 'Get an ATS score, section-by-section breakdown, keyword gap analysis, and 5 Gemini-powered improvement suggestions.',
    color: 'text-blue-400',
    bg:    'bg-blue-500/10',
  },
  {
    icon: Lock,
    title: 'Verified Employers',
    description: 'Companies go through DNS, HTTP, LinkedIn, and document checks before getting the Verified badge. No more ghost companies.',
    color: 'text-amber-400',
    bg:    'bg-amber-500/10',
  },
]

export default function LandingPage() {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Gradient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] rounded-full bg-violet-500/8 blur-[100px]" />
        <div className="absolute -bottom-40 right-1/3 w-[400px] h-[400px] rounded-full bg-blue-500/8 blur-[100px]" />
      </div>

      {/* Nav */}
      <header className="relative z-10 border-b border-border/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">TrustHire AI</span>
            <Badge variant="default" className="text-[10px]">BETA</Badge>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how"      className="hover:text-foreground transition-colors">How it works</a>
            <a href="#stats"    className="hover:text-foreground transition-colors">Stats</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/register">Get started <ArrowRight className="w-3.5 h-3.5" /></Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6 animate-fade-in">
          <Zap className="w-3 h-3" />
          Powered by Gemini AI + SBERT
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 animate-slide-up">
          Find Jobs You Can
          <br />
          <span className="gradient-text">Actually Trust</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up">
          TrustHire AI scores every job listing 0–100 for legitimacy,
          matches your profile using semantic AI, and analyzes your resume — all powered by Gemini.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap animate-slide-up">
          <Button size="lg" asChild>
            <Link to="/register?role=CANDIDATE">
              Start as Job Seeker <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/register?role=EMPLOYER">
              Post a Job <Briefcase className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map(({ value, label }) => (
            <div key={label} className="glass rounded-2xl p-6 text-center border border-border/50">
              <p className="text-3xl font-extrabold gradient-text mb-1">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <Badge variant="secondary" className="mb-4">Features</Badge>
          <h2 className="text-4xl font-bold mb-4">Built for the Indian Job Market</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Every feature is designed to protect job seekers from scams and help employers find quality talent.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURES.map(({ icon: Icon, title, description, color, bg }) => (
            <div key={title} className="glass rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 group">
              <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <Badge variant="secondary" className="mb-4">How it Works</Badge>
          <h2 className="text-4xl font-bold mb-4">3 Steps to a Better Job Search</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Create Profile', desc: 'Sign up, upload your resume, and let our AI analyze your strengths and skill gaps.' },
            { step: '02', title: 'Browse Trusted Jobs', desc: 'Every listing shows a real-time Trust Score. Filter by score, role, location, and salary.' },
            { step: '03', title: 'Apply with Confidence', desc: 'Our AI ranks your match score against each job. Apply knowing your profile is a strong fit.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="relative glass rounded-2xl p-8 border border-border/50">
              <span className="text-6xl font-extrabold text-border/30 absolute top-4 right-6 select-none">{step}</span>
              <h3 className="text-lg font-bold mb-3">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="glass rounded-3xl p-12 border border-primary/20">
          <h2 className="text-4xl font-bold mb-4">Ready to Find Your Next Role?</h2>
          <p className="text-muted-foreground mb-8">Join 10,000+ job seekers who trust TrustHire AI to protect their job search.</p>
          <Button size="lg" asChild>
            <Link to="/register">Get Started for Free <ArrowRight className="w-4 h-4" /></Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">TrustHire AI</span>
            <span>© 2024</span>
          </div>
          <p>Protecting job seekers across India with AI-powered trust verification.</p>
        </div>
      </footer>
    </div>
  )
}
