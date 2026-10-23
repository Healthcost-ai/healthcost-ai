
import { useRef, useState } from 'react';
import './BillAnalyzer.css';

const sampleAnalysis = {
  hospital: 'Sample City Hospital',
  billNumber: 'DEMO-2026-001',
  billDate: '20 October 2026',
  total: 4850,
  items: [
    {
      name: 'Doctor consultation',
      quantity: 1,
      unitPrice: 800,
      amount: 800,
      note: 'Consultation charge',
    },
    {
      name: 'Blood test',
      quantity: 1,
      unitPrice: 650,
      amount: 650,
      note: 'Laboratory investigation',
    },
    {
      name: 'Medication',
      quantity: 1,
      unitPrice: 1200,
      amount: 1200,
      note: 'Medicine charges',
    },
    {
      name: 'Room charges',
      quantity: 1,
      unitPrice: 2200,
      amount: 2200,
      note: 'Room and facility charges',
    },
  ],
  questions: [
    'Can you provide an itemized breakdown of the room charges?',
    'Are the laboratory charges covered by my insurance?',
    'Can you provide an itemized receipt for the medication charges?',
  ],
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function BillAnalyzer({ onBack }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  function validateFile(selectedFile) {
    setError('');
    setShowResults(false);
    setDemoMode(false);

    if (!selectedFile) return;

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setFile(null);
      setError('Please select a PDF, JPG, or PNG file.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setFile(null);
      setError('Your file is too large. Maximum file size is 10 MB.');
      return;
    }

    setFile(selectedFile);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    validateFile(event.dataTransfer.files?.[0]);
  }

  function runDemo() {
    if (!file || analyzing) return;

    setAnalyzing(true);
    setError('');
    setShowResults(false);

    // Demo only: no file is sent to an AI service.
    window.setTimeout(() => {
      setAnalyzing(false);
      setDemoMode(true);
      setShowResults(true);
    }, 900);
  }

  function clearFile() {
    setFile(null);
    setError('');
    setShowResults(false);
    setDemoMode(false);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  const calculatedTotal = sampleAnalysis.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  return (
    <div className="analyzer-page">
      <header className="analyzer-topbar">
        <button className="back-button" onClick={onBack}>
          <span aria-hidden="true">←</span> Back to dashboard
        </button>

        <div className="analyzer-brand">
          <span className="brand-mark">+</span>
          <span>HealthCost <strong>AI</strong></span>
        </div>

        <span className="demo-label">Frontend demo</span>
      </header>

      <main className="analyzer-main">
        <section className="analyzer-intro">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            MEDICAL BILL ANALYSIS
          </div>

          <h1>Understand your medical bill.</h1>

          <p>
            Upload a hospital bill to explore its charges, understand
            unfamiliar items, and prepare questions for your billing team.
          </p>
        </section>

        <section className="upload-card">
          <div className="section-heading">
            <div>
              <h2>Upload your medical bill</h2>
              <p>Choose a file from your device to get started.</p>
            </div>
            <span className="step-badge">STEP 1</span>
          </div>

          <div
            className={`analyzer-dropzone ${dragging ? 'is-dragging' : ''} ${
              file ? 'has-file' : ''
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="visually-hidden"
              onChange={(event) => validateFile(event.target.files?.[0])}
              aria-label="Choose a medical bill file"
            />

            {file ? (
              <>
                <div className="file-icon">FILE</div>
                <h3 className="selected-file-name">{file.name}</h3>
                <p>
                  {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready for demo
                </p>

                <div className="file-actions">
                  <button
                    className="secondary-button"
                    onClick={() => inputRef.current?.click()}
                  >
                    Choose another
                  </button>
                  <button className="text-button" onClick={clearFile}>
                    Remove file
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="upload-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4.5 15.5v3A1.5 1.5 0 006 20h12a1.5 1.5 0 001.5-1.5v-3"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <h3>Drag and drop your bill here</h3>
                <p>Or select a file from your device</p>

                <button
                  className="primary-button"
                  onClick={() => inputRef.current?.click()}
                >
                  Browse files
                </button>

                <span className="file-hint">
                  PDF, JPG or PNG · Maximum 10 MB
                </span>
              </>
            )}
          </div>

          {error && (
            <div className="analyzer-error" role="alert">
              <span aria-hidden="true">!</span> {error}
            </div>
          )}

          <div className="privacy-note">
            <span aria-hidden="true">ⓘ</span>
            <p>
              <strong>Privacy reminder:</strong> This demo only selects a file
              in your browser. It does not upload your bill to a server.
            </p>
          </div>

          <button
            className="analyze-button"
            disabled={!file || analyzing}
            onClick={runDemo}
          >
            {analyzing ? (
              <>
                <span className="loading-spinner" />
                Preparing demo results...
              </>
            ) : (
              <>
                Analyze bill <span aria-hidden="true">→</span>
              </>
            )}
          </button>

          <p className="demo-caption">
            Demo mode: analysis results below use illustrative sample data,
            not the contents of your uploaded file.
          </p>
        </section>

        {showResults && (
          <section className="analysis-results" aria-live="polite">
            <div className="results-heading">
              <div>
                <div className="eyebrow">
                  <span className="eyebrow-dot" />
                  ANALYSIS PREVIEW
                </div>
                <h2>Your bill breakdown</h2>
                <p>Illustrative results for demonstration purposes only.</p>
              </div>

              {demoMode && <span className="sample-badge">SAMPLE DATA</span>}
            </div>

            <div className="result-summary-grid">
              <article className="result-summary-card">
                <span>Bill total</span>
                <strong>{formatCurrency(sampleAnalysis.total)}</strong>
                <small>Illustrative amount</small>
              </article>

              <article className="result-summary-card">
                <span>Line items</span>
                <strong>{sampleAnalysis.items.length}</strong>
                <small>Example charges</small>
              </article>

              <article className="result-summary-card">
                <span>Calculated total</span>
                <strong>{formatCurrency(calculatedTotal)}</strong>
                <small>Sum of sample line items</small>
              </article>
            </div>

            <article className="results-card">
              <div className="results-card-heading">
                <div>
                  <h3>Itemized charges</h3>
                  <p>{sampleAnalysis.hospital} · Example bill</p>
                </div>
                <span className="neutral-status">Not verified</span>
              </div>

              <div className="table-scroll">
                <table className="charges-table">
                  <thead>
                    <tr>
                      <th>Charge description</th>
                      <th>Qty.</th>
                      <th>Unit price</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleAnalysis.items.map((item) => (
                      <tr key={item.name}>
                        <td>
                          <strong>{item.name}</strong>
                          <small>{item.note}</small>
                        </td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.unitPrice)}</td>
                        <td>{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3">Calculated sample total</td>
                      <td>{formatCurrency(calculatedTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="calculation-note">
                <span aria-hidden="true">ⓘ</span>
                The example line items total {formatCurrency(calculatedTotal)},
                while the sample bill total is{' '}
                {formatCurrency(sampleAnalysis.total)}. This is a deliberately
                illustrative difference for UI testing, not a finding about
                your uploaded bill or a claim of overcharging.
              </div>
            </article>

            <div className="result-two-column">
              <article className="results-card">
                <div className="insight-icon">i</div>
                <h3>What these charges mean</h3>
                <p>
                  Consultation charges generally cover a clinician's visit.
                  Laboratory charges relate to tests, while medication and room
                  charges depend on the services and items supplied.
                </p>
                <p className="muted-copy">
                  Actual inclusions and prices depend on the provider and bill.
                  These explanations are general examples.
                </p>
              </article>

              <article className="results-card questions-card">
                <div className="insight-icon">?</div>
                <h3>Questions to ask the hospital</h3>
                <ul>
                  {sampleAnalysis.questions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </article>
            </div>

            <div className="results-disclaimer">
              <strong>Important:</strong> These are static sample results.
              The uploaded document has not been read or analyzed. Check
              charges with your healthcare provider before making a decision.
            </div>

            <button className="secondary-button new-analysis-button" onClick={clearFile}>
              Start a new demo
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
