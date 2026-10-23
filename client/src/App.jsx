import { useEffect, useRef, useState } from 'react'
import './App.css'
import BillAnalyzer from './pages/BillAnalyzer.jsx'
import TreatmentPriceFinder from './pages/TreatmentPriceFinder.jsx'
import PersonalSavingsDashboard from './components/PersonalSavingsDashboard.jsx'
import AuthPage from './components/AuthPage.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import {
  analyzeBillUpload as uploadBillForAnalysis,
  createBill,
  createSavingsRecord,
  deleteBill,
  deleteSavingsRecord,
  explainBill,
  getBills,
  getCurrentUser,
  getSavingsRecords,
  logout,
} from './lib/api'
import './theme.css'

const DEMO_STORAGE_KEY = 'healthcost-ai-demo-bills'
const DEMO_SAVINGS_STORAGE_KEY = 'healthcost-ai-demo-savings'
const THEME_STORAGE_KEY = 'healthcost-ai-theme'

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

function readDemoSavings() {
  const saved = window.localStorage.getItem(DEMO_SAVINGS_STORAGE_KEY)
  if (!saved) return []
  const records = JSON.parse(saved)
  if (!Array.isArray(records)) throw new Error('Saved demo savings records are not in a readable format.')
  return records
}

function calculateDemoBill(input) {
  const discrepancies = []
  const items = input.items.map((item, index) => {
    const submittedLineTotal = item.lineTotal ?? item.submittedLineTotal ?? item.calculatedLineTotal
    const calculatedLineTotal = Math.round(item.quantity * item.unitPrice * 100) / 100
    if (Math.abs(calculatedLineTotal - submittedLineTotal) > 0.01) {
      discrepancies.push(`Item ${index + 1} (${item.description}): calculated ${formatCurrency(calculatedLineTotal, input.currency)}, billed ${formatCurrency(submittedLineTotal, input.currency)}`)
    }
    return {
      ...item,
      submittedLineTotal,
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
  const [theme, setTheme] = useState(() => window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light')
  const [authStatus, setAuthStatus] = useState('loading')
  const [user, setUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [bills, setBills] = useState([])
  const [savingsRecords, setSavingsRecords] = useState([])
  const [billsLoading, setBillsLoading] = useState(true)
  const [savingsLoading, setSavingsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedBill, setSelectedBill] = useState(null)
  const reportDialogRef = useRef(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  function toggleTheme() {
    setTheme(current => current === 'dark' ? 'light' : 'dark')
  }

  useEffect(() => {
    const dialog = reportDialogRef.current
    if (selectedBill && dialog && !dialog.open) dialog.showModal()
  }, [selectedBill])

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
    const billLoad = user?.demoMode
      ? Promise.resolve().then(readDemoBills)
      : getBills().then(data => data.bills || [])
    const savingsLoad = user?.demoMode
      ? Promise.resolve().then(readDemoSavings)
      : getSavingsRecords().then(data => data.records || [])
    Promise.allSettled([billLoad, savingsLoad]).then(([billResult, savingsResult]) => {
      if (active) {
        if (billResult.status === 'fulfilled') {
          setBills(billResult.value)
        } else {
          setError(billResult.reason.message || 'Could not load saved reports.')
        }
        if (savingsResult.status === 'fulfilled') {
          setSavingsRecords(savingsResult.value)
        } else {
          setError(savingsResult.reason.message || 'Could not load savings records.')
        }
      }
    }).finally(() => {
      if (active) {
        setBillsLoading(false)
        setSavingsLoading(false)
      }
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

  async function saveSavingsRecord(record) {
    let savedRecord
    if (user?.demoMode) {
      savedRecord = { ...record, id: `demo-savings-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString() }
      const updated = [savedRecord, ...savingsRecords]
      window.localStorage.setItem(DEMO_SAVINGS_STORAGE_KEY, JSON.stringify(updated))
      setSavingsRecords(updated)
    } else {
      const response = await createSavingsRecord(record)
      savedRecord = response.record
      setSavingsRecords(current => [savedRecord, ...current])
    }
    return savedRecord
  }

  async function handleDeleteSavingsRecord(id) {
    if (!window.confirm('Delete this savings record? This cannot be undone.')) return
    setError('')
    try {
      if (user?.demoMode) {
        const updated = savingsRecords.filter(record => record.id !== id)
        window.localStorage.setItem(DEMO_SAVINGS_STORAGE_KEY, JSON.stringify(updated))
        setSavingsRecords(updated)
      } else {
        await deleteSavingsRecord(id)
        setSavingsRecords(current => current.filter(record => record.id !== id))
      }
    } catch (deleteError) {
      setError(deleteError.message || 'Could not delete this savings record.')
    }
  }

  async function analyzeUploadedBill(file) {
    const response = await uploadBillForAnalysis(file, user?.demoMode)
    let analyzedBill = response.bill
    if (user?.demoMode) {
      analyzedBill = calculateDemoBill({
        ...response.bill,
        items: response.bill.items.map(item => ({
          ...item,
          lineTotal: item.submittedLineTotal,
        })),
      })
      analyzedBill.validation = response.bill.validation
      const updated = [analyzedBill, ...bills]
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated))
      setBills(updated)
    } else {
      setBills(current => [analyzedBill, ...current])
    }
    return { ...response, bill: analyzedBill }
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
    setSavingsRecords([])
    setCurrentPage('dashboard')
    setAuthStatus('unauthenticated')
  }

  if (authStatus === 'loading') {
    return <main className="auth-page"><ThemeToggle theme={theme} onToggle={toggleTheme} /><p>Loading your workspace…</p></main>
  }

  if (authStatus === 'unauthenticated') {
    return (
      <AuthPage
        theme={theme}
        onToggleTheme={toggleTheme}
        onAuthenticated={authenticatedUser => {
          setBillsLoading(true)
          setSavingsLoading(true)
          setError('')
          setUser(authenticatedUser)
          setAuthStatus('authenticated')
        }}
        onDemo={() => {
          setBillsLoading(true)
          setSavingsLoading(true)
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
        theme={theme}
        onToggleTheme={toggleTheme}
        onBack={() => setCurrentPage('dashboard')}
        onSave={saveBill}
        onAnalyzeUpload={analyzeUploadedBill}
        onExplain={handleExplain}
      />
    )
  }

  if (currentPage === 'treatmentFinder') {
    return (
      <TreatmentPriceFinder
        onBack={() => setCurrentPage('dashboard')}
        onSaveComparison={saveSavingsRecord}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    )
  }

  const trackedTotal = bills
    .filter(bill => bill.currency === 'INR')
    .reduce((sum, bill) => sum + (Number(bill.total) || 0), 0)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#dashboard" aria-label="HealthCost AI dashboard">
          <span className="dashboard-brand-mark" aria-hidden="true">
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
          <button type="button" className="nav-link nav-button" onClick={() => setCurrentPage('treatmentFinder')}><span className="nav-icon">₹</span>Treatment price finder</button>
          <a href="#savings" className="nav-link"><span className="nav-icon">↗</span>Savings dashboard</a>
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
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
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

          <PersonalSavingsDashboard
            bills={bills}
            records={savingsRecords}
            loading={savingsLoading}
            onAddManualRecord={saveSavingsRecord}
            onDeleteRecord={handleDeleteSavingsRecord}
            onFindRates={() => setCurrentPage('treatmentFinder')}
          />

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
                <li><strong>Government rate reference</strong><span>Search official CGHS treatment rates by tier and ward.</span></li>
              </ul>
              <button type="button" className="text-button" onClick={() => setCurrentPage('treatmentFinder')}>Find treatment rates <span>→</span></button>
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
                    <button type="button" className="report-view" onClick={() => setSelectedBill(bill)}>
                      {bill.patientLabel || 'Medical bill'}
                      <span>View details</span>
                    </button>
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

          {selectedBill && (
            <dialog
              className="report-dialog"
              ref={reportDialogRef}
              aria-labelledby="report-dialog-title"
              onClose={() => setSelectedBill(null)}
            >
              <div className="report-dialog-header">
                <div>
                  <div className="section-kicker">SAVED REPORT</div>
                  <h2 id="report-dialog-title">{selectedBill.patientLabel || 'Medical bill'}</h2>
                  <p>{selectedBill.createdAt ? new Date(selectedBill.createdAt).toLocaleString() : 'Saved report'}</p>
                </div>
                <button type="button" className="report-dialog-close" aria-label="Close report details" onClick={() => reportDialogRef.current?.close()}>×</button>
              </div>
              <div className="report-dialog-summary">
                <div><span>Subtotal</span><strong>{formatCurrency(selectedBill.subtotal, selectedBill.currency || 'INR')}</strong></div>
                <div><span>Tax / other charges</span><strong>{formatCurrency(selectedBill.tax, selectedBill.currency || 'INR')}</strong></div>
                <div><span>Calculated total</span><strong>{formatCurrency(selectedBill.total, selectedBill.currency || 'INR')}</strong></div>
              </div>
              <section className="report-dialog-section">
                <h3>Line items ({selectedBill.items?.length || 0})</h3>
                {selectedBill.items?.length ? (
                  <div className="report-dialog-items">
                    {selectedBill.items.map((item, index) => (
                      <article className="report-dialog-item" key={`${item.description}-${index}`}>
                        <div>
                          <strong>{item.description}</strong>
                          <span>Quantity: {item.quantity} × {formatCurrency(item.unitPrice, selectedBill.currency || 'INR')}</span>
                          <span>Billed: {formatCurrency(item.submittedLineTotal ?? item.lineTotal ?? item.calculatedLineTotal, selectedBill.currency || 'INR')}</span>
                        </div>
                        <div className="report-dialog-calculated">
                          <span>Calculated</span>
                          <strong>{formatCurrency(item.calculatedLineTotal ?? item.lineTotal ?? item.submittedLineTotal, selectedBill.currency || 'INR')}</strong>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : <p className="report-dialog-empty">No line items were saved for this report.</p>}
              </section>
              <section className="report-dialog-section">
                <h3>Arithmetic check</h3>
                {selectedBill.validation?.discrepancies?.length ? (
                  <ul className="difference-list">
                    {selectedBill.validation.discrepancies.map((entry, index) => <li key={`${index}-${entry}`}>{entry}</li>)}
                  </ul>
                ) : (
                  <p className="report-dialog-empty">The saved amounts are arithmetically consistent.</p>
                )}
              </section>
              <p className="report-dialog-disclaimer">This report checks arithmetic only. It does not verify medical necessity, fair pricing, or insurance coverage.</p>
            </dialog>
          )}

          <footer className="page-footer"><span>© 2026 HealthCost AI</span><span>Built for clarity, designed for people.</span><span>Not a substitute for medical advice.</span></footer>
        </div>
      </main>
    </div>
  )
}

export default App
