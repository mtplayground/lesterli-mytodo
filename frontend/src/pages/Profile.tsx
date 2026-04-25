import { useMutation, useQuery } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'
import { ApiClientError } from '../api/client'
import { changePassword, getMe } from '../api/me'
import EmptyState from '../components/EmptyState'
import LoadingState from '../components/LoadingState'
import Toast from '../components/Toast'

const MIN_PASSWORD_LENGTH = 8

export default function Profile() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  })

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onError: () => {
      setSuccessMessage(null)
    },
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setValidationError(null)
      setSuccessMessage('Password updated successfully.')
    },
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!currentPassword) {
      setValidationError('Current password is required.')
      return
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setValidationError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    if (newPassword !== confirmPassword) {
      setValidationError('New password and confirmation must match.')
      return
    }

    if (newPassword === currentPassword) {
      setValidationError('New password must be different from the current password.')
      return
    }

    setValidationError(null)
    setSuccessMessage(null)

    await changePasswordMutation.mutateAsync({
      current_password: currentPassword,
      new_password: newPassword,
    })
  }

  return (
    <section className="space-y-6">
      {changePasswordMutation.isError ? (
        <Toast
          message={toErrorMessage(changePasswordMutation.error, 'Failed to update password.')}
          onDismiss={() => changePasswordMutation.reset()}
          title="Password update failed"
        />
      ) : null}
      {successMessage ? (
        <Toast
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
          title="Password updated"
          variant="success"
        />
      ) : null}
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-panel">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Profile</p>
            <h2 className="mt-2 text-3xl font-semibold text-ink">Account settings</h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">
              Review the authenticated account details and rotate your password without leaving the
              app.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-panel">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Current User</p>

          {meQuery.isPending ? <LoadingState label="Loading profile..." /> : null}

          {meQuery.isError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {toErrorMessage(meQuery.error, 'Failed to load profile.')}
            </div>
          ) : null}

          {!meQuery.isPending && !meQuery.isError && !meQuery.data ? (
            <EmptyState
              eyebrow="Profile"
              message="The account details are unavailable right now. Refresh and try again."
              title="No profile data"
            />
          ) : null}

          {meQuery.data ? (
            <div className="mt-6 space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Email</p>
                <p className="mt-2 break-all text-xl font-semibold text-ink">
                  {meQuery.data.email}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Created</p>
                  <p className="mt-2 text-sm text-slate-700">
                    {formatTimestamp(meQuery.data.created_at)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Updated</p>
                  <p className="mt-2 text-sm text-slate-700">
                    {formatTimestamp(meQuery.data.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-panel">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Change Password</p>
          <h3 className="mt-2 text-2xl font-semibold text-ink">Rotate your credentials</h3>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Enter your current password and choose a new one with at least eight characters.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Current password</span>
              <input
                autoComplete="current-password"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-accent focus:bg-white"
                disabled={changePasswordMutation.isPending}
                onChange={(event) => setCurrentPassword(event.target.value)}
                type="password"
                value={currentPassword}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">New password</span>
              <input
                autoComplete="new-password"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-accent focus:bg-white"
                disabled={changePasswordMutation.isPending}
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                value={newPassword}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Confirm new password</span>
              <input
                autoComplete="new-password"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-accent focus:bg-white"
                disabled={changePasswordMutation.isPending}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                value={confirmPassword}
              />
            </label>

            {validationError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {validationError}
              </div>
            ) : null}

            <button
              className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={changePasswordMutation.isPending}
              type="submit"
            >
              {changePasswordMutation.isPending ? 'Updating password...' : 'Update password'}
            </button>
          </form>
        </section>
      </div>
    </section>
  )
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString()
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    return error.message
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}
