
import { useEffect, useRef, useState } from 'react'
import './App.css'
import BillAnalyzer from './pages/BillAnalyzer.jsx';
import AnalysisPreview from './components/AnalysisPreview.jsx'
import AuthPage from './components/AuthPage.jsx'
import { checkBackend, getCurrentUser, logout } from './lib/api'

const sampleReports = [
  {
    id: 1,
    initials: 'MC',
    name: 'Medical consultation',
    category: 'Consultation',
    date: '12 Oct 2026',
    amount: 1500,
    status: 'Sample',
  },
  {
    id: 2,
    initials: 'LB',
    name: 'Laboratory tests',
    category: 'Diagnostics',
    date: '08 Oct 2026',
    amount: 2850,
    status: 'Sample',
  },
  {
    id: 3,
    initials: 'PH',
    name: 'Pharmacy invoice',
    category: 'Medication',
    date: '02 Oct 2026',
    amount: 740,
    status: 'Sample',
  },
]

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function App() {
  useEffect(() => {
  getCurrentUser()
    .then((data) => {
      console.log(
        'Current user:',
        data.user ? data.user.email : 'Not signed in'
      )
    })
    .catch((error) => {
      console.error('Authentication check failed:', error.message)
    })
}, [])
  useEffect(() => {
  checkBackend()
    .then((data) => console.log('Backend connected:', data))
    .catch((error) => console.error('Backend connection failed:', error))
}, [])
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showDemoResults, setShowDemoResults] = useState(false)
  const fileInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [notice, setNotice] = useState('')
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [isDragging, setIsDragging] = useState(false)
  const [authStatus, setAuthStatus] = useState('loading')
const [user, setUser] = useState(null)

useEffect(() => {
  let active = true

  getCurrentUser()
    .then((data) => {
      if (!active) return

      setUser(data.user || null)
      setAuthStatus(data.user ? 'authenticated' : 'unauthenticated')
    })
    .catch((error) => {
      if (!active) return

      console.error('Authentication check failed:', error.message)
      setUser(null)
      setAuthStatus('unauthenticated')
    })

  return () => {
    active = false
  }
}, [])

  function selectFile(file) {
    setNotice('')

    if (!file) return

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ]

    if (!allowedTypes.includes(file.type)) {
      setSelectedFile(null)
      setNotice('Please select a PDF, JPG, or PNG file.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setSelectedFile(null)
      setNotice('Your file must be smaller than 10 MB.')
      return
    }
    setShowDemoResults(false)

    setSelectedFile(file)
    setNotice('File selected. Analysis will be available in a future step.')
  }

 function handleSubmit(event) {
  event.preventDefault()

  if (!selectedFile) {
    setNotice('Choose a medical bill before continuing.')
    return
  }

  setNotice('')
  setShowDemoResults(true)

  window.setTimeout(() => {
    document.getElementById('analysis-results')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, 100)
}
  function handleNavigation(event, label) {
    event.preventDefault()
    setActiveNav(label)

    if (label === 'Dashboard') {
      document.getElementById('dashboard')?.scrollIntoView({
        behavior: 'smooth',
      })
    } else if (label === 'Analyze a bill') {
      document.getElementById('upload')?.scrollIntoView({
        behavior: 'smooth',
      })
    } else if (label === 'Reports') {
      document.getElementById('reports')?.scrollIntoView({
        behavior: 'smooth',
      })
    } else {
      setNotice('The price comparison screen is coming soon.')
      document.getElementById('compare')?.scrollIntoView({
        behavior: 'smooth',
      })
    }
  }
  if (authStatus === 'loading') {
  return (
    <main className="auth-page">
      <p>Checking your secure session...</p>
    </main>
  )
}

if (authStatus === 'unauthenticated') {
  return (
    <AuthPage
      onAuthenticated={(loggedInUser) => {
        setUser(loggedInUser)
        setAuthStatus('authenticated')
      }}
    />
  )
}
if (currentPage === 'analyzer') {
  return (
    <BillAnalyzer
      onBack={() => setCurrentPage('dashboard')}
    />
  );
}
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#dashboard"
          onClick={(event) => handleNavigation(event, 'Dashboard')}
        >
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="12" fill="currentColor" />
              <path
                d="M20 10V30M10 20H30"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="brand-copy">
            <strong>HealthCost<span> AI</span></strong>
            <small>Healthcare clarity</small>
          </span>
        </a>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <a
            href="#dashboard"
            className={`nav-link ${activeNav === 'Dashboard' ? 'active' : ''}`}
            onClick={(event) => handleNavigation(event, 'Dashboard')}
          >
            <span className="nav-icon">▦</span>
            <span>Dashboard</span>
          </a>

          <a
            href="#upload"
            className={`nav-link ${activeNav === 'Analyze a bill' ? 'active' : ''}`}
            onClick={(event) => handleNavigation(event, 'Analyze a bill')}
          >
            <span className="nav-icon">↥</span>
            <span>Analyze a bill</span>
          </a>

          <a
            href="#compare"
            className={`nav-link ${activeNav === 'Compare prices' ? 'active' : ''}`}
            onClick={(event) => handleNavigation(event, 'Compare prices')}
          >
            <span className="nav-icon">⇄</span>
            <span>Compare prices</span>
            <span className="nav-soon">Soon</span>
          </a>

          <a
            href="#reports"
            className={`nav-link ${activeNav === 'Reports' ? 'active' : ''}`}
            onClick={(event) => handleNavigation(event, 'Reports')}
          >
            <span className="nav-icon">▤</span>
            <span>Reports</span>
          </a>
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-help">
          <div className="help-icon">✳</div>
          <strong>Healthcare costs, clearer.</strong>
          <p>Make sense of medical bills, one step at a time.</p>
          <span>Your health. Your understanding.</span>
        </div>

        <div className="sidebar-footer">
          <span className="online-dot" />
          Frontend preview
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div className="topbar-title">
            <span className="topbar-eyebrow">YOUR WORKSPACE</span>
            <span className="topbar-page">Dashboard</span>
          </div>

          
<div className="topbar-actions">
  <span className="preview-label">
    <span className="online-dot" />
    Signed in
  </span>

  <span className="profile-email">
    {user?.email}
  </span>

  <button
    type="button"
    className="profile-button"
    aria-label="Sign out"
    title="Sign out"
    onClick={async () => {
      try {
        await logout()
      } catch (error) {
        console.error('Sign-out request failed:', error.message)
      } finally {
        setUser(null)
        setAuthStatus('unauthenticated')
      }
    }}
  >
    ↪
  </button>
</div>

        </header>

        <div className="dashboard-content">
          <section className="welcome-section">
            <div className="welcome-copy">
              <div className="eyebrow">
                <span className="eyebrow-line" />
                YOUR HEALTHCARE FINANCES
              </div>
              <h1>Healthcare costs,<br className="desktop-break" /> made clearer.</h1>
              <p>
                Understand your medical bills, keep track of expenses,
                and make more informed healthcare cost decisions.
              </p>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                document.getElementById('upload')?.scrollIntoView({
                  behavior: 'smooth',
                })
              }
            >
              <span className="button-plus">+</span>
              Analyze a bill
            </button>
          </section>

          <section className="summary-grid" aria-label="Dashboard summary">
            <article className="summary-card">
              <div className="summary-top">
                <span className="summary-icon mint">▤</span>
                <span className="summary-caption">YOUR ACTIVITY</span>
              </div>
              <p className="summary-label">Bills analyzed</p>
              <div className="summary-bottom">
                <strong className="summary-value">0</strong>
                <span className="summary-note">No analyses yet</span>
              </div>
            </article>

            <article className="summary-card">
              <div className="summary-top">
                <span className="summary-icon sky">₹</span>
                <span className="summary-caption">EXPENSE TRACKER</span>
              </div>
              <p className="summary-label">Expenses tracked</p>
              <div className="summary-bottom">
                <strong className="summary-value">₹0</strong>
                <span className="summary-note">Your saved bills</span>
              </div>
            </article>

            <article className="summary-card">
              <div className="summary-top">
                <span className="summary-icon lavender">⇄</span>
                <span className="summary-caption">PRICE EXPLORER</span>
              </div>
              <p className="summary-label">Price comparisons</p>
              <div className="summary-bottom">
                <strong className="summary-value summary-coming">
                  Coming soon
                </strong>
              </div>
            </article>
          </section>

          <section className="content-grid">
            <article className="panel upload-panel" id="upload">
              <div className="panel-heading">
                <div>
                  <div className="section-kicker">GET STARTED</div>
                  <h2>Analyze a medical bill</h2>
                  <p>See your healthcare expenses more clearly.</p>
                </div>
                <span className="panel-heading-icon">↗</span>
              </div>

              <form onSubmit={handleSubmit}>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="visually-hidden"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={(event) => selectFile(event.target.files?.[0])}
                />

                <button
                  type="button"
                  className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault()
                    setIsDragging(false)
                    selectFile(event.dataTransfer.files?.[0])
                  }}
                >
                  <span className="upload-illustration">
                    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
                      <path
                        d="M14 5H28L38 15V39C38 41.2 36.2 43 34 43H14C11.8 43 10 41.2 10 39V9C10 6.8 11.8 5 14 5Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M27 5V16H38M17 27L24 20L31 27M24 20V35"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <strong>
                    {selectedFile ? selectedFile.name : 'Drop your bill here'}
                  </strong>
                  <span className="upload-secondary">
                    or <span>browse files</span> on your device
                  </span>
                  <span className="upload-formats">
                    PDF, JPG or PNG <span>•</span> Max 10 MB
                  </span>
                </button>

                {notice && (
                  <p className="status-message" role="status">
                    {notice}
                  </p>
                )}

                {selectedFile && (
                  <div className="selected-file">
                    <span className="file-type-icon">
                      {selectedFile.type === 'application/pdf' ? 'PDF' : 'IMG'}
                    </span>
                    <span className="selected-file-name">
                      <strong>{selectedFile.name}</strong>
                      <small>
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </small>
                    </span>
                    <button
                      type="button"
                      className="remove-file"
                      aria-label="Remove selected file"
                      onClick={() => {
                        setSelectedFile(null)
                        setNotice('')
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}

                <button type="submit" className="analyze-button">
                  Continue to analysis
                  <span>→</span>
                </button>

                <p className="privacy-note">
                  <span>♧</span>
                  Your privacy matters. Uploading is not enabled in this demo.
                </p>
              </form>
            </article>

            <article className="panel overview-panel">
              <div className="panel-heading">
                <div>
                  <div className="section-kicker">YOUR OVERVIEW</div>
                  <h2>Getting started</h2>
                  <p>Your healthcare cost journey starts here.</p>
                </div>
              </div>

              <div className="overview-steps">
                <div className="overview-step">
                  <span className="step-number">01</span>
                  <div>
                    <strong>Upload your bill</strong>
                    <p>Choose a PDF or image of your medical invoice.</p>
                  </div>
                </div>
                <div className="step-connector" />
                <div className="overview-step">
                  <span className="step-number">02</span>
                  <div>
                    <strong>Understand each charge</strong>
                    <p>Review line items and explanations in plain language.</p>
                  </div>
                </div>
                <div className="step-connector" />
                <div className="overview-step">
                  <span className="step-number">03</span>
                  <div>
                    <strong>Explore your options</strong>
                    <p>Compare healthcare prices when verified data is available.</p>
                  </div>
                </div>
              </div>

              <div className="overview-footer">
                <span className="sparkle">✳</span>
                <span>Designed to make healthcare costs easier to understand.</span>
              </div>
            </article>
          </section>
          {showDemoResults && selectedFile && (
  <AnalysisPreview
    fileName={selectedFile.name}
    onChooseAnother={() => {
      setShowDemoResults(false)
      setSelectedFile(null)
      setNotice('')

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      document.getElementById('upload')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }}
  />
)}

          <section className="reports-section" id="reports">
            <div className="reports-heading">
              <div>
                <div className="section-kicker">YOUR RECORDS</div>
                <h2>Recent reports</h2>
                <p>A preview of how your analyzed bills will appear.</p>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => setNotice('Saved reports will be available after backend integration.')}
              >
                View all <span>→</span>
              </button>
            </div>

            <div className="reports-table">
              <div className="report-table-header">
                <span>REPORT</span>
                <span>CATEGORY</span>
                <span>DATE</span>
                <span>AMOUNT</span>
                <span>STATUS</span>
              </div>

              {sampleReports.map((report) => (
                <div className="report-row" key={report.id}>
                  <div className="report-name-cell">
                    <span className="report-avatar">{report.initials}</span>
                    <strong>{report.name}</strong>
                  </div>
                  <span className="report-category">{report.category}</span>
                  <span className="report-date">{report.date}</span>
                  <strong className="report-amount">
                    {formatCurrency(report.amount)}
                  </strong>
                  <span className="sample-status">{report.status}</span>
                </div>
              ))}
            </div>

            <p className="sample-disclaimer">
              These reports contain illustrative sample data only, not actual
              patient records or verified medical expenses.
            </p>
          </section>

          <section className="comparison-banner" id="compare">
            <div className="banner-decoration" aria-hidden="true">✳</div>
            <div className="banner-copy">
              <span>COMING SOON</span>
              <h2>Make confident healthcare cost decisions.</h2>
              <p>
                Explore healthcare prices with transparent sources,
                provider details, and package inclusions.
              </p>
            </div>
            <button
              type="button"
              className="banner-button"
              onClick={() => setNotice('Price comparison is planned for a future version.')}
            >
              Explore the vision <span>→</span>
            </button>
          </section>

          <footer className="page-footer">
            <span>© 2026 HealthCost AI</span>
            <span>Built for clarity, designed for people.</span>
            <span>Not a substitute for medical advice.</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
