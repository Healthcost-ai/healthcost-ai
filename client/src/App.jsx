import { useEffect, useState } from 'react'
import './App.css'
import BillAnalyzer from './pages/BillAnalyzer.jsx'
import AuthPage from './components/AuthPage.jsx'
import { createBill, deleteBill, explainBill, getBills, getCurrentUser, logout } from './lib/api'

const DEMO_STORAGE_KEY = 'healthcost-ai-demo-bills'

function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0)
}

function readDemoBills() {
  const saved = window.localStorage.getItem(DEMO_STORAGE_KEY)
  if (!saved) return []
  const bills = JSON.parse(saved)
  if (!Array.isArray(bills)) throw new Error('Saved demo reports are not in a readable format.')
  return bills
}

function calculateDemoBill(input) {
  const discrepancies = []
  const items = input.items.map((item, index) => {
    const calculatedLineTotal = Math.round(item.quantity * item.unitPrice * 100) / 100
    if (Math.abs(calculatedLineTotal - item.lineTotal) > 0.01) {
      discrepancies.push(`Item ${index + 1} (${item.description}): calculated ${formatCurrency(calculatedLineTotal, input.currency)}, billed ${formatCurrency(item.lineTotal, input.currency)}`)
    }
    return {
      ...item,
      submittedLineTotal: item.lineTotal,
      calculatedLineTotal,
    }
  })
  const calculatedSubtotal = Math.round(items.reduce((sum, item) => sum + item.calculatedLineTotal, 0) * 100) / 100
  const submittedSubtotal = items.reduce((sum, item) => sum + item.submittedLineTotal, 0)
  if (Math.abs(calculatedSubtotal - submittedSubtotal) > 0.01) {
    discrepancies.push(`Subtotal: calculated ${formatCurrency(calculatedSubtotal, input.currency)}, billed ${formatCurrency(submittedSubtotal, input.currency)}`)
  }
  const calculatedTotal = Math.round((calculatedSubtotal + input.tax) * 100) / 100
  if (Math.abs(calculatedTotal - input.total) > 0.01) {
    discrepancies.push(`Grand total: calculated ${formatCurrency(calculatedTotal, input.currency)}, billed ${formatCurrency(input.total, input.currency)}`)
  }

  return {
    ...input,
    id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    items,
    subtotal: calculatedSubtotal,
    total: calculatedTotal,
    validation: { isConsistent: discrepancies.length === 0, discrepancies },
    createdAt: new Date().toISOString(),
  }
}

function App() {
  const [authStatus, setAuthStatus] = useState('loading')
  const [user, setUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [bills, setBills] = useState([])
  const [billsLoading, setBillsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getCurrentUser()
      .then(data => {
        if (!active) return
        setUser(data.user || null)
        setAuthStatus(data.user ? 'authenticated' : 'unauthenticated')
      })
      .catch(() => {
        if (!active) return
        setUser(null)
        setAuthStatus('unauthenticated')
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (authStatus !== 'authenticated') return
    let active = true
    const load = user?.demoMode
      ? Promise.resolve().then(readDemoBills)
      : getBills().then(data => data.bills || [])
    load.then(loadedBills => {
      if (active) setBills(loadedBills)
    }).catch(loadError => {
      if (active) setError(loadError.message || 'Could not load saved reports.')
    }).finally(() => {
      if (active) setBillsLoading(false)
    })
    return () => { active = false }
  }, [authStatus, user])

  async function saveBill(bill) {
    let savedBill
    if (user?.demoMode) {
      savedBill = calculateDemoBill(bill)
      const updated = [savedBill, ...bills]
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated))
      setBills(updated)
    } else {
      const response = await createBill(bill)
      savedBill = response.bill
      setBills(current => [savedBill, ...current])
    }
    return savedBill
  }

  async function handleExplain(id) {
    const response = await explainBill(id, true)
    return response.explanation
  }

  async function handleDeleteBill(id) {
    if (!window.confirm('Delete this saved bill report? This cannot be undone.')) return
    setError('')
    try {
      if (user?.demoMode) {
        const updated = bills.filter(bill => bill.id !== id)
        window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated))
        setBills(updated)
      } else {
        await deleteBill(id)
        setBills(current => current.filter(bill => bill.id !== id))
      }
    } catch (deleteError) {
      setError(deleteError.message || 'Could not delete this report.')
    }
  }

  async function handleSignOut() {
    if (!user?.demoMode) {
      try {
        await logout()
      } catch (signOutError) {
        setError(signOutError.message || 'Could not sign out.')
        return
      }
    }
    setUser(null)
    setBills([])
    setCurrentPage('dashboard')
    setAuthStatus('unauthenticated')
  }

  if (authStatus === 'loading') {
    return <main className="auth-page"><p>Loading your workspace…</p></main>
  }

  if (authStatus === 'unauthenticated') {
    return (
      <AuthPage
        onAuthenticated={authenticatedUser => {
          setBillsLoading(true)
          setError('')
          setUser(authenticatedUser)
          setAuthStatus('authenticated')
        }}
        onDemo={() => {
          setBillsLoading(true)
          setError('')
          setUser({ email: 'Local demo', demoMode: true })
          setAuthStatus('authenticated')
        }}
      />
    )
  }

  if (currentPage === 'analyzer') {
    return (
      <BillAnalyzer
        demoMode={user?.demoMode}
        onBack={() => setCurrentPage('dashboard')}
        onSave={saveBill}
        onExplain={handleExplain}
      />
    )
  }

  const trackedTotal = bills
    .filter(bill => bill.currency === 'INR')
    .reduce((sum, bill) => sum + (Number(bill.total) || 0), 0)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#dashboard" onClick={event => event.preventDefault()}>
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="12" fill="currentColor" />
              <path d="M20 10V30M10 20H30" stroke="white" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="brand-copy"><strong>HealthCost<span> AI</span></strong><small>Healthcare clarity</small></span>
        </a>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <a href="#dashboard" className="nav-link active"><span className="nav-icon">▦</span>Dashboard</a>
          <button type="button" className="nav-link nav-button" onClick={() => setCurrentPage('analyzer')}><span className="nav-icon">＋</span>Check a bill</button>
          <a href="#reports" className="nav-link"><span className="nav-icon">▤</span>Saved reports</a>
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-help">
          <div className="help-icon">✳</div>
          <strong>Healthcare costs, clearer.</strong>
          <p>Check the math, understand the bill, and ask better questions.</p>
          <span>Your health. Your understanding.</span>
        </div>
        <div className="sidebar-footer"><span className="online-dot" />{user?.demoMode ? 'Private local demo' : 'Account workspace'}</div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div className="topbar-title"><span className="topbar-eyebrow">YOUR WORKSPACE</span><span className="topbar-page">Dashboard</span></div>
          <div className="topbar-actions">
            <span className="preview-label"><span className="online-dot" />{user?.demoMode ? 'Demo mode' : 'Signed in'}</span>
            <span className="profile-email">{user?.demoMode ? 'Data stays in this browser' : user?.email}</span>
            <button type="button" className="profile-button" aria-label="Sign out" title="Sign out" onClick={handleSignOut}>↪</button>
          </div>
        </header>

        <div className="dashboard-content">
          {error && <p className="dashboard-error" role="alert">{error}</p>}
          {user?.demoMode && <div className="demo-callout"><strong>Interactive local demo</strong><span>Reports are saved only in this browser. No account, server, or external AI is used.</span></div>}
          <section className="welcome-section">
            <div className="welcome-copy">
              <div className="eyebrow"><span className="eyebrow-line" />YOUR HEALTHCARE FINANCES</div>
              <h1>Healthcare costs,<br className="desktop-break" /> made clearer.</h1>
              <p>Enter a medical bill to check arithmetic, save the results, and prepare neutral questions for your billing team.</p>
            </div>
            <button type="button" className="primary-button" onClick={() => setCurrentPage('analyzer')}><span className="button-plus">+</span> Check a bill</button>
          </section>

          <section className="summary-grid" aria-label="Dashboard summary">
            <article className="summary-card">
              <div className="summary-top"><span className="summary-icon mint">▤</span><span className="summary-caption">YOUR ACTIVITY</span></div>
              <p className="summary-label">Saved reports</p>
              <div className="summary-bottom"><strong className="summary-value">{bills.length}</strong><span className="summary-note">{billsLoading ? 'Refreshing…' : 'Your bill checkups'}</span></div>
            </article>
            <article className="summary-card">
              <div className="summary-top"><span className="summary-icon sky">₹</span><span className="summary-caption">INR REPORTS</span></div>
              <p className="summary-label">Tracked bill totals</p>
              <div className="summary-bottom"><strong className="summary-value">{formatCurrency(trackedTotal)}</strong><span className="summary-note">INR reports only</span></div>
            </article>
            <article className="summary-card">
              <div className="summary-top"><span className="summary-icon lavender">✓</span><span className="summary-caption">BILL CHECK</span></div>
              <p className="summary-label">Arithmetic differences</p>
              <div className="summary-bottom"><strong className="summary-value">{bills.filter(bill => !bill.validation?.isConsistent).length}</strong><span className="summary-note">Reports to review</span></div>
            </article>
          </section>

          <section className="content-grid">
            <article className="panel upload-panel">
              <div className="panel-heading">
                <div><div className="section-kicker">GET STARTED</div><h2>Check your bill</h2><p>Enter line items to calculate and compare the amounts.</p></div>
                <span className="panel-heading-icon">↗</span>
              </div>
              <div className="overview-steps">
                <div className="overview-step"><span className="step-number">01</span><div><strong>Enter bill amounts</strong><p>Add item descriptions, quantities, and billed amounts.</p></div></div>
                <div className="step-connector" />
                <div className="overview-step"><span className="step-number">02</span><div><strong>Review the math</strong><p>See calculated totals and any arithmetic differences.</p></div></div>
                <div className="step-connector" />
                <div className="overview-step"><span className="step-number">03</span><div><strong>Keep a report</strong><p>Save, revisit, and remove your reports at any time.</p></div></div>
              </div>
              <button type="button" className="primary-button analyzer-start" onClick={() => setCurrentPage('analyzer')}>Start a bill check <span>→</span></button>
            </article>
            <article className="panel overview-panel">
              <div className="panel-heading"><div><div className="section-kicker">BUILT FOR CLARITY</div><h2>What this tool can do</h2><p>Support for better billing conversations.</p></div></div>
              <ul className="feature-list">
                <li><strong>Arithmetic validation</strong><span>Line-by-line math, independently recalculated.</span></li>
                <li><strong>Saved bill history</strong><span>Find recent reports in your workspace.</span></li>
                <li><strong>Privacy-first explanations</strong><span>AI explanation is optional and requires consent.</span></li>
              </ul>
              <p className="medical-disclaimer">This is not medical, insurance, or legal advice. A math difference is not proof of an incorrect or unfair charge.</p>
            </article>
          </section>

          <section className="reports-section" id="reports">
            <div className="reports-heading">
              <div><div className="section-kicker">YOUR RECORDS</div><h2>Recent reports</h2><p>Saved bill checks for this workspace.</p></div>
              <button type="button" className="text-button" onClick={() => setCurrentPage('analyzer')}>New check <span>→</span></button>
            </div>
            <div className="reports-table">
              <div className="report-table-header"><span>REPORT</span><span>ITEMS</span><span>DATE</span><span>AMOUNT</span><span>STATUS</span></div>
              {billsLoading ? <div className="reports-empty">Loading reports…</div> : bills.length === 0 ? (
                <div className="reports-empty">No reports yet. Start a bill check to create your first saved report.</div>
              ) : bills.slice(0, 8).map(bill => (
                <div className="report-row" key={bill.id}>
                  <div className="report-name-cell">
                    <span className="report-avatar">{(bill.patientLabel || 'B').slice(0, 2).toUpperCase()}</span>
                    <strong>{bill.patientLabel || 'Medical bill'}</strong>
                    <button type="button" className="report-delete" aria-label={`Delete ${bill.patientLabel || 'report'}`} title="Delete report" onClick={() => handleDeleteBill(bill.id)}>×</button>
                  </div>
                  <span className="report-category">{bill.items?.length || 0} line items</span>
                  <span className="report-date">{bill.createdAt ? new Date(bill.createdAt).toLocaleDateString() : '—'}</span>
                  <strong className="report-amount">{formatCurrency(bill.total, bill.currency || 'INR')}</strong>
                  <span className={bill.validation?.isConsistent ? 'bill-status-ok' : 'bill-status-review'}>{bill.validation?.isConsistent ? 'Math matches' : 'Review'}</span>
                </div>
              ))}
            </div>
            <p className="sample-disclaimer">Reports reflect only the amounts entered. They are not verified provider prices or a judgment about medical necessity, coverage, or fairness.</p>
          </section>

          <footer className="page-footer"><span>© 2026 HealthCost AI</span><span>Built for clarity, designed for people.</span><span>Not a substitute for medical advice.</span></footer>
        </div>
      </main>
    </div>
  )
}

export default App
