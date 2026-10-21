export interface Entry {
  date: string // YYYY-MM-DD
  sentence: string
  createdAt: number
}

export interface User {
  name: string
  createdAt: number
}

export const STORAGE_KEY = 'one-sentence-journal'
export const USER_KEY = 'one-sentence-user'