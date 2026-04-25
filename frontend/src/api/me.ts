import { apiClient } from './client'

export type Me = {
  id: string
  email: string
  created_at: number
  updated_at: number
}

export type ChangePasswordInput = {
  current_password: string
  new_password: string
}

export function getMe(): Promise<Me> {
  return apiClient.get<Me>('/api/me')
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await apiClient.post<null>('/api/me/password', {
    body: input,
  })
}
