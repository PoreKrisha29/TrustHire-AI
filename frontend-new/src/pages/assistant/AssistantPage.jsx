import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { assistantApi } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import useAuthStore from '@/stores/auth.store'
import {
  Send, Sparkles, Bot, User, Loader2, MessageSquare,
  RefreshCw, TrendingUp, FileText, Briefcase, DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const SESSION_KEY = 'trusthire_chat_session'

const SUGGESTED_PROMPTS = [
  { icon: FileText,  text: 'How can I improve my resume for a software engineer role?' },
  { icon: Briefcase, text: 'Tips for acing a technical interview at a product startup' },
  { icon: DollarSign,text: 'What is the average salary for a data scientist in Bangalore?' },
  { icon: TrendingUp,text: 'How do I negotiate my first salary offer?' },
]

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex gap-3 max-w-3xl', isUser ? 'ml-auto flex-row-reverse' : '')}>
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
        isUser ? 'bg-primary/20 text-primary' : 'bg-violet-500/20 text-violet-400'
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={cn(
        'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser
          ? 'bg-primary/15 text-foreground rounded-tr-sm'
          : 'bg-secondary/60 text-muted-foreground rounded-tl-sm'
      )}>
        <p className="whitespace-pre-wrap">{msg.content}</p>
        {msg.timestamp && (
          <p className={cn('text-[10px] mt-1.5 opacity-50', isUser ? 'text-right' : '')}>
            {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  )
}

export default function AssistantPage() {
  const { user } = useAuthStore()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [sessionId] = useState(() => {
    const stored = sessionStorage.getItem(SESSION_KEY)
    if (stored) return stored
    const id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, id)
    return id
  })
  const endRef = useRef(null)

  const { data: quota } = useQuery({
    queryKey: ['chat-quota'],
    queryFn:  () => assistantApi.quota().then(r => r.data.data),
    refetchInterval: 30000,
  })

  const chatMutation = useMutation({
    mutationFn: (message) => assistantApi.chat({
      message,
      sessionId,
      history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
    }),
    onMutate: (message) => {
      const userMsg = { role: 'user', content: message, timestamp: new Date().toISOString() }
      setMessages(prev => [...prev, userMsg])
      setInput('')
    },
    onSuccess: (res) => {
      const reply = res.data.data.reply
      setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: new Date().toISOString() }])
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to get response')
      setMessages(prev => prev.slice(0, -1))
    },
  })

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatMutation.isPending])

  const send = () => {
    if (!input.trim() || chatMutation.isPending) return
    if (quota && quota.remaining <= 0) {
      toast.error('Daily AI limit reached. Come back tomorrow!')
      return
    }
    chatMutation.mutate(input.trim())
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            AI Career Assistant
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Powered by Gemini 1.5 Flash · Specialized in Indian job market</p>
        </div>
        {quota && (
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Daily quota</p>
              <p className="text-sm font-semibold">{quota.remaining} / {quota.limit} left</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{Math.round((quota.remaining / quota.limit) * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Chat area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-5" id="chat-scroll">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-1">How can I help your career today?</h3>
              <p className="text-sm text-muted-foreground mb-8 max-w-sm">
                Ask me about resumes, interviews, salary negotiation, career transitions, and more.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {SUGGESTED_PROMPTS.map(({ icon: Icon, text }) => (
                  <button
                    key={text}
                    onClick={() => { setInput(text); }}
                    className="flex items-start gap-3 p-4 rounded-xl bg-secondary/40 hover:bg-secondary/70 border border-border/50 hover:border-primary/30 transition-all text-left group"
                  >
                    <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
              {chatMutation.isPending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="bg-secondary/60 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </>
          )}
        </CardContent>

        {/* Input bar */}
        <div className="p-4 border-t border-border/50">
          {messages.length > 0 && (
            <p className="text-[10px] text-muted-foreground mb-2 text-center">
              ⚠ AI-generated advice. Verify important decisions with a career professional.
            </p>
          )}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about resumes, interviews, salary…"
              disabled={chatMutation.isPending || (quota && quota.remaining <= 0)}
              className="flex-1"
            />
            <Button
              onClick={send}
              disabled={!input.trim() || chatMutation.isPending || (quota && quota.remaining <= 0)}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
