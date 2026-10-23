
import { useState } from 'react'
import { login, register, verifyEmail } from '../lib/api'

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verificationToken, setVerificationToken] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

  return (
    <main className="auth-page">
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
                : 'Enter the verification token from your email.'}
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
              <label htmlFor="verification-token">Verification token</label>
              <input
                id="verification-token"
                type="text"
                autoComplete="one-time-code"
                value={verificationToken}
                onChange={(event) => setVerificationToken(event.target.value)}
                placeholder="Paste your email verification token"
                required
              />
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

        <p className="auth-privacy">
          Your medical cost workspace. Built with privacy in mind.
        </p>
      </section>
    </main>
  )
}
