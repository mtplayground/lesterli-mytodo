import { create } from 'zustand'

const AUTH_STORAGE_KEY = 'lesterli-mytodo.auth'

export type AuthUser = {
  id: string
  email: string
  created_at: number
  updated_at: number
}

export type AuthSession = {
  token: string
  user: AuthUser
}

type PersistedAuthState = {
  token: string | null
  user: AuthUser | null
}

type AuthStore = PersistedAuthState & {
  hydrate: () => void
  isAuthenticated: () => boolean
  setSession: (session: AuthSession) => void
  clearSession: () => void
}

const emptyAuthState: PersistedAuthState = {
  token: null,
  user: null,
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...readStoredAuthState(),
  clearSession: () => {
    clearStoredAuthState()
    set(emptyAuthState)
  },
  hydrate: () => {
    set(readStoredAuthState())
  },
  isAuthenticated: () => Boolean(get().token),
  setSession: (session) => {
    const nextState: PersistedAuthState = {
      token: session.token,
      user: session.user,
    }

    writeStoredAuthState(nextState)
    set(nextState)
  },
}))

function clearStoredAuthState() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}

function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<AuthUser>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.created_at === 'number' &&
    typeof candidate.updated_at === 'number'
  )
}

function readStoredAuthState(): PersistedAuthState {
  if (typeof window === 'undefined') {
    return emptyAuthState
  }

  const stored = window.localStorage.getItem(AUTH_STORAGE_KEY)
  if (!stored) {
    return emptyAuthState
  }

  try {
    const parsed = JSON.parse(stored) as Partial<PersistedAuthState>
    return {
      token: typeof parsed.token === 'string' ? parsed.token : null,
      user: isAuthUser(parsed.user) ? parsed.user : null,
    }
  } catch {
    clearStoredAuthState()
    return emptyAuthState
  }
}

function writeStoredAuthState(state: PersistedAuthState) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state))
}
