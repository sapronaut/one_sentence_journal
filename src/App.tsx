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
import { ChevronLeft, ChevronRight, Moon, Sun, BookOpen } from 'lucide-react'
import type { Entry, User } from './types'
import { STORAGE_KEY, USER_KEY } from './types'

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
  const dates = Object.keys(entries).sort().reverse()
  if (dates.length === 0) return 0

  let streak = 0
  let current = new Date()

  const todayStr = format(current, 'yyyy-MM-dd')
  const yesterdayStr = format(new Date(current.getTime() - 86400000), 'yyyy-MM-dd')

  if (!entries[todayStr] && !entries[yesterdayStr]) return 0

  if (!entries[todayStr]) {
    current = new Date(current.getTime() - 86400000)
  }

  while (true) {
    const dateStr = format(current, 'yyyy-MM-dd')
    if (entries[dateStr]) {
      streak++
      current = new Date(current.getTime() - 86400000)
    } else {
      break
    }
  }
  return streak
}

export default function App() {
  const [entries, setEntries] = useState<Record<string, Entry>>({})
  const [user, setUser] = useState<User | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [draft, setDraft] = useState('')
  const [isDark, setIsDark] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setEntries(loadEntries())
    setUser(loadUser())
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    setDraft(entries[selectedDate]?.sentence || '')
  }, [selectedDate, entries])

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
      createdAt: Date.now(),
    }

    setEntries(prev => {
      const next = { ...prev, [selectedDate]: entry }
      saveEntries(next)
      return next
    })
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

  const hasEntry = (date: Date) => !!entries[format(date, 'yyyy-MM-dd')]
  const streak = calculateStreak(entries)
  const totalEntries = Object.keys(entries).length

  return (
    <AnimatePresence mode="wait">
      {!user ? (
        // ---------- Name screen ----------
        <motion.div
          key="welcome"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex min-h-screen items-center justify-center bg-stone-100 px-6 dark:bg-stone-950"
        >
          <div className="w-full max-w-md text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-stone-800 text-stone-50 shadow-lg dark:bg-stone-100 dark:text-stone-900"
            >
              <BookOpen className="h-8 w-8" />
            </motion.div>

            <h1 className="mb-3 text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
              One Sentence
            </h1>
            <p className="mb-10 text-stone-500 dark:text-stone-400">
              A quiet place for one thought a day.
            </p>

            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              placeholder="What should we call you?"
              className="mb-6 w-full rounded-2xl border border-stone-300 bg-white px-5 py-4 text-center text-lg text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-600"
              autoFocus
            />

            <button
              onClick={handleSaveName}
              disabled={!nameInput.trim()}
              className="w-full rounded-2xl bg-stone-900 py-4 text-lg font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
            >
              Begin
            </button>
          </div>
        </motion.div>
      ) : (
        // ---------- Main Journal ----------
        <motion.div
          key="journal"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-screen bg-stone-50 transition-colors dark:bg-stone-950"
        >
          {/* Header */}
          <header className="border-b border-stone-200/60 bg-stone-50/80 backdrop-blur-xl dark:border-stone-800/60 dark:bg-stone-950/80">
            <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-800 text-lg font-medium text-stone-50 dark:bg-stone-200 dark:text-stone-900">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                    {getGreeting(user.name)}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {streak > 0 ? `${streak} day streak` : 'Start your streak today'}
                    {totalEntries > 0 && ` · ${totalEntries} entries`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDark(!isDark)}
                className="rounded-xl p-2.5 text-stone-500 transition hover:bg-stone-200/70 dark:hover:bg-stone-800"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
          </header>

          <main className="mx-auto max-w-2xl px-6 py-10">
            {/* Writing area */}
            <section className="mb-14">
              <p className="mb-4 text-sm font-medium tracking-wide text-stone-500 dark:text-stone-400">
                {isToday(parseISO(selectedDate))
                  ? 'Today’s sentence'
                  : format(parseISO(selectedDate), 'EEEE, MMMM d')}
              </p>

              <textarea
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={saveSentence}
                onKeyDown={handleKeyDown}
                placeholder="What stayed with you today?"
                rows={4}
                className="w-full resize-none rounded-3xl border border-stone-200 bg-white px-6 py-5 text-xl leading-relaxed text-stone-800 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-600 dark:focus:border-stone-600"
                style={{ fontFamily: 'Georgia, serif' }}
              />
              <p className="mt-3 text-right text-xs text-stone-400">
                Enter to save · {draft.trim() ? 'Saved' : 'Waiting for your words'}
              </p>
            </section>

            {/* Calendar */}
            <section>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-sm font-medium text-stone-500 dark:text-stone-400">
                  {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-xs text-stone-400">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const filled = hasEntry(day)
                  const selected = dateStr === selectedDate
                  const today = isToday(day)

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`
                        relative flex aspect-square items-center justify-center rounded-2xl text-sm font-medium transition-all
                        ${selected
                          ? 'bg-stone-900 text-white shadow-md dark:bg-stone-100 dark:text-stone-900'
                          : filled
                          ? 'bg-stone-300/80 text-stone-800 dark:bg-stone-700 dark:text-stone-200'
                          : 'text-stone-400 hover:bg-stone-200/70 dark:hover:bg-stone-800'}
                        ${today && !selected ? 'ring-2 ring-stone-400/60 ring-offset-2 ring-offset-stone-50 dark:ring-offset-stone-950' : ''}
                      `}
                    >
                      {format(day, 'd')}
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