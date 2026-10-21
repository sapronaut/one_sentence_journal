import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  subMonths,
  addMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import type { Entry, User } from './types'
import { STORAGE_KEY, USER_KEY } from './types'

// ---------- Helpers ----------
function loadEntries(): Record<string, Entry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveEntries(entries: Record<string, Entry>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

function getGreeting(name: string) {
  const hour = new Date().getHours()
  if (hour < 12) return `Good morning, ${name}`
  if (hour < 17) return `Good afternoon, ${name}`
  return `Good evening, ${name}`
}

function calculateStreak(entries: Record<string, Entry>): number {
  let streak = 0
  let current = new Date()

  const todayStr = format(current, 'yyyy-MM-dd')
  const yesterdayStr = format(new Date(current.getTime() - 86400000), 'yyyy-MM-dd')

  if (!entries[todayStr] && !entries[yesterdayStr]) return 0
  if (!entries[todayStr]) current = new Date(current.getTime() - 86400000)

  while (true) {
    const dateStr = format(current, 'yyyy-MM-dd')
    if (entries[dateStr]) {
      streak++
      current = new Date(current.getTime() - 86400000)
    } else break
  }
  return streak
}

const PROMPTS = [
  "What stayed with you today?",
  "What made you pause for a moment?",
  "What felt quiet and true?",
  "What are you carrying into tomorrow?",
  "What small thing felt meaningful?",
  "What did you notice that others might have missed?",
  "What are you grateful for right now?",
  "What felt heavy, and what felt light?",
  "What would you tell a friend about today?",
  "What moment do you want to remember?",
]

function getDailyPrompt() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  )
  return PROMPTS[dayOfYear % PROMPTS.length]
}

const MOODS = [
  { id: 'calm', color: 'bg-sky-400', label: 'Calm' },
  { id: 'warm', color: 'bg-amber-400', label: 'Warm' },
  { id: 'soft', color: 'bg-rose-400', label: 'Soft' },
  { id: 'clear', color: 'bg-emerald-400', label: 'Clear' },
  { id: 'deep', color: 'bg-indigo-400', label: 'Deep' },
]

function playSaveSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.frequency.value = 680
    osc.type = 'sine'

    gain.gain.setValueAtTime(0.04, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch {}
}

// ---------- Main Component ----------
export default function App() {
  const [entries, setEntries] = useState<Record<string, Entry>>({})
  const [user, setUser] = useState<User | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [draft, setDraft] = useState('')
  const [selectedMood, setSelectedMood] = useState<string | undefined>()
  const [celebration, setCelebration] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const prevStreak = useRef(0)

  useEffect(() => {
    setEntries(loadEntries())
    setUser(loadUser())
  }, [])

  useEffect(() => {
    const entry = entries[selectedDate]
    setDraft(entry?.sentence || '')
    setSelectedMood(entry?.mood)
  }, [selectedDate, entries])

  useEffect(() => {
    const streak = calculateStreak(entries)
    const milestones = [3, 7, 14, 21, 30, 60, 100]

    if (streak > prevStreak.current && milestones.includes(streak)) {
      setCelebration(`${streak} day streak — beautiful.`)
      setTimeout(() => setCelebration(null), 3500)
    }
    prevStreak.current = streak
  }, [entries])

  const handleSaveName = () => {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    const newUser: User = { name: trimmed, createdAt: Date.now() }
    saveUser(newUser)
    setUser(newUser)
  }

  const saveSentence = () => {
    const trimmed = draft.trim()

    if (!trimmed) {
      setEntries(prev => {
        const next = { ...prev }
        delete next[selectedDate]
        saveEntries(next)
        return next
      })
      return
    }

    const entry: Entry = {
      date: selectedDate,
      sentence: trimmed,
      mood: selectedMood,
      createdAt: Date.now(),
    }

    setEntries(prev => {
      const next = { ...prev, [selectedDate]: entry }
      saveEntries(next)
      return next
    })

    playSaveSound()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveSentence()
      inputRef.current?.blur()
    }
  }

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  
  const streak = calculateStreak(entries)
  const totalEntries = Object.keys(entries).length
  const prompt = getDailyPrompt()

  return (
    <AnimatePresence mode="wait">
      {!user ? (
        // ---------- Welcome ----------
        <motion.div
          key="welcome"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex min-h-screen items-center justify-center bg-[#0c0c0c] px-6"
        >
          <div className="w-full max-w-md text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-stone-100 text-stone-900 shadow-lg"
            >
              <BookOpen className="h-8 w-8" />
            </motion.div>

            <h1 className="mb-3 text-3xl font-semibold tracking-tight text-stone-100">
              One Sentence
            </h1>
            <p className="mb-10 text-stone-500">A quiet place for one thought a day.</p>

            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              placeholder="What should we call you?"
              className="mb-6 w-full rounded-2xl border border-stone-800 bg-[#161616] px-5 py-4 text-center text-lg text-stone-100 placeholder:text-stone-600 focus:border-stone-600 focus:outline-none"
              autoFocus
            />

            <button
              onClick={handleSaveName}
              disabled={!nameInput.trim()}
              className="w-full rounded-2xl bg-stone-100 py-4 text-lg font-medium text-stone-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Begin
            </button>
          </div>
        </motion.div>
      ) : (
        // ---------- Journal ----------
        <motion.div
          key="journal"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-screen bg-[#0c0c0c] text-stone-100"
        >
          {/* Celebration toast */}
          <AnimatePresence>
            {celebration && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-full bg-stone-100 px-5 py-2.5 text-sm text-stone-900 shadow-lg"
              >
                {celebration}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <header className="border-b border-stone-800/80 bg-[#0c0c0c]/80 backdrop-blur-xl">
            <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-lg font-medium text-stone-900">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-100">
                    {getGreeting(user.name)}
                  </p>
                  <p className="text-xs text-stone-500">
                    {streak > 0 ? `${streak} day streak` : 'Start your streak today'}
                    {totalEntries > 0 && ` · ${totalEntries} entries`}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-2xl px-6 py-10">
            {/* Writing area */}
            <section className="mb-14">
              <p className="mb-2 text-sm font-medium tracking-wide text-stone-500">
                {isToday(parseISO(selectedDate))
                  ? 'Today’s sentence'
                  : format(parseISO(selectedDate), 'EEEE, MMMM d')}
              </p>

              {/* Daily Prompt */}
              <p className="mb-4 text-sm italic text-stone-600">{prompt}</p>

              <textarea
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={saveSentence}
                onKeyDown={handleKeyDown}
                placeholder="Write one sentence…"
                rows={4}
                className="w-full resize-none rounded-3xl border border-stone-800 bg-[#161616] px-6 py-5 text-xl leading-relaxed text-stone-100 placeholder:text-stone-600 focus:border-stone-600 focus:outline-none"
                style={{ fontFamily: 'Georgia, serif' }}
              />

              {/* Mood dots */}
              <div className="mt-4 flex items-center gap-3">
                <span className="text-xs text-stone-600">Mood</span>
                {MOODS.map(mood => (
                  <button
                    key={mood.id}
                    onClick={() =>
                      setSelectedMood(selectedMood === mood.id ? undefined : mood.id)
                    }
                    title={mood.label}
                    className={`h-5 w-5 rounded-full transition-all ${mood.color} ${
                      selectedMood === mood.id
                        ? 'scale-125 ring-2 ring-stone-500 ring-offset-2 ring-offset-[#0c0c0c]'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>

              <p className="mt-3 text-right text-xs text-stone-600">
                Enter to save · {draft.trim() ? 'Saved' : 'Waiting for your words'}
              </p>
            </section>

            {/* Calendar */}
            <section>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-sm font-medium text-stone-500">
                  {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-900"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-900"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-xs text-stone-600">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const entry = entries[dateStr]
                  const filled = !!entry
                  const selected = dateStr === selectedDate
                  const today = isToday(day)
                  const moodColor = MOODS.find(m => m.id === entry?.mood)?.color

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`
                        relative flex aspect-square items-center justify-center rounded-2xl text-sm font-medium transition-all
                        ${
                          selected
                            ? 'bg-stone-100 text-stone-900 shadow-md'
                            : filled
                            ? 'bg-stone-800 text-stone-200'
                            : 'text-stone-600 hover:bg-stone-900'
                        }
                        ${today && !selected ? 'ring-2 ring-stone-600 ring-offset-2 ring-offset-[#0c0c0c]' : ''}
                      `}
                    >
                      {format(day, 'd')}
                      {moodColor && (
                        <span
                          className={`absolute bottom-1.5 h-1.5 w-1.5 rounded-full ${moodColor}`}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  )
}