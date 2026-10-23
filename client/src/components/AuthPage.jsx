
import { useEffect, useState } from 'react'
import { login, register, resendVerification, verifyEmail } from '../lib/api'
import ThemeToggle from './ThemeToggle.jsx'

export default function AuthPage({ onAuthenticated, onDemo, theme, onToggleTheme }) {
  const [mode, setMode] = useState(() => new URLSearchParams(window.location.search).has('token') ? 'verify' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verificationToken, setVerificationToken] = useState(() => new URLSearchParams(window.location.search).get('token') || '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(() => new URLSearchParams(window.location.search).has('token'))

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) return

    let active = true
    verifyEmail(token)
      .then((result) => {
        if (!active) return
        setMessage(result.message || 'Email verified. You can now sign in.')
        setMode('login')
        window.history.replaceState({}, '', window.location.pathname)
      })
      .catch((err) => {
        if (!active) return
        setError(err.message || 'Unable to verify your email. Enter the token below or request a new one.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (mode === 'register') {
        const result = await register(email.trim(), password)
        setMessage(
          result.message ||
            'If registration is possible, verification instructions will be sent to your email.'
        )
        setMode('verify')
      } else if (mode === 'verify') {
        const result = await verifyEmail(verificationToken.trim())
        setMessage(result.message || 'Email verified. You can now sign in.')
        setMode('login')
        window.history.replaceState({}, '', window.location.pathname)
      } else {
        const result = await login(email.trim(), password)

        if (result.user) {
          onAuthenticated(result.user)
        } else {
          setError('Login succeeded, but no user information was returned.')
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendVerification() {
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const result = await resendVerification(email.trim())
      setMessage(result.message || 'If this address needs verification, instructions will be sent.')
    } catch (err) {
      setError(err.message || 'Unable to resend verification instructions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      <section className="auth-card">
        <a className="auth-brand" href="/" aria-label="HealthCost AI home">
          <span className="auth-brand-mark">+</span>
          <span>
            <strong>HealthCost<span> AI</span></strong>
            <small>Healthcare clarity</small>
          </span>
        </a>

        <div className="auth-heading">
          <span className="auth-kicker">YOUR HEALTHCARE WORKSPACE</span>
          <h1>
            {mode === 'login'
              ? 'Welcome back.'
              : mode === 'register'
                ? 'Create your account.'
                : 'Verify your email.'}
          </h1>
          <p>
            {mode === 'login'
              ? 'Sign in to manage your medical bill reports.'
              : mode === 'register'
                ? 'Create an account to keep your reports in one place.'
                : 'Open the verification link in your email or enter the token below.'}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode !== 'verify' && (
            <>
              <label htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                maxLength={254}
                required
              />

              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={
                  mode === 'register'
                    ? 'At least 12 characters'
                    : 'Enter your password'
                }
                minLength={mode === 'register' ? 12 : undefined}
                maxLength={128}
                required
              />
            </>
          )}

          {mode === 'verify' && (
            <>
              <label htmlFor="resend-email">Email address (for resend)</label>
              <input
                id="resend-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                maxLength={254}
              />
              <label htmlFor="verification-token">Verification token</label>
              <input
                id="verification-token"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={verificationToken}
                onChange={(event) => setVerificationToken(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter your six-digit code"
                minLength={6}
                maxLength={6}
                pattern="\d{6}"
                required
              />
              <button
                className="text-button"
                type="button"
                disabled={loading || !email.trim()}
                onClick={handleResendVerification}
              >
                Resend verification email
              </button>
            </>
          )}

          {error && (
            <p className="auth-message auth-error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="auth-message auth-success" role="status">
              {message}
            </p>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? 'Sign in'
                : mode === 'register'
                  ? 'Create account'
                  : 'Verify email'}
            {!loading && <span>→</span>}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register')
                  setError('')
                  setMessage('')
                }}
              >
                Create one
              </button>
            </>
          ) : mode === 'register' ? (
            <>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setError('')
                  setMessage('')
                }}
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              Already verified?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setError('')
                  setMessage('')
                }}
              >
                Sign in
              </button>
            </>
          )}
        </div>

        {mode === 'login' && (
          <div className="demo-entry">
            <span>Just exploring?</span>
            <button type="button" onClick={onDemo}>Try the interactive demo</button>
            <small>Uses local browser storage. No account or bill upload required.</small>
          </div>
        )}

        <p className="auth-privacy">
          Your medical cost workspace. Built with privacy in mind.
        </p>
      </section>
    </main>
  )
}
