import { apiClient } from './client'
import type { AuthSession } from '../stores/auth'

export type AuthCredentials = {
  email: string
  password: string
}

export function login(credentials: AuthCredentials): Promise<AuthSession> {
  return apiClient.post<AuthSession>('/api/auth/login', {
    body: credentials,
  })
}

export function register(credentials: AuthCredentials): Promise<AuthSession> {
  return apiClient.post<AuthSession>('/api/auth/register', {
    body: credentials,
  })
}
