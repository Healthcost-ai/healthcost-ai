import { useMemo, useState } from 'react'
import './BillAnalyzer.css'

const blankItem = () => ({ description: '', quantity: '1', unitPrice: '', lineTotal: '' })

const currencyOptions = ['INR', 'USD', 'GBP', 'EUR']

function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0)
}

function makeDemoBill() {
  return {
    patientLabel: 'City Hospital visit',
    currency: 'INR',
    items: [
      { description: 'Consultation fee', quantity: '1', unitPrice: '800', lineTotal: '800' },
      { description: 'Complete blood count', quantity: '1', unitPrice: '450', lineTotal: '650' },
      { description: 'Room charges', quantity: '1', unitPrice: '2200', lineTotal: '2200' },
    ],
    tax: '0',
    total: '3650',
  }
}

export default function BillAnalyzer({ onBack, onSave, onExplain, demoMode = false }) {
  const [patientLabel, setPatientLabel] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [items, setItems] = useState([blankItem()])
  const [tax, setTax] = useState('0')
  const [billTotal, setBillTotal] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [explaining, setExplaining] = useState(false)

  const calculatedSubtotal = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0),
    [items],
  )
  function updateItem(index, field, value) {
    setItems(current => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )))
    setResult(null)
    setExplanation('')
  }

  function loadExample() {
    const example = makeDemoBill()
    setPatientLabel(example.patientLabel)
    setCurrency(example.currency)
    setItems(example.items)
    setTax(example.tax)
    setBillTotal(example.total)
    setResult(null)
    setExplanation('')
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setResult(null)
    setExplanation('')

    const normalizedItems = items.map(item => ({
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal === '' ? Number(item.quantity) * Number(item.unitPrice) : item.lineTotal),
    }))
      if (normalizedItems.length > 500 || normalizedItems.some(item => !item.description || !Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 1_000_000 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0 || item.unitPrice > 1_000_000_000 || !Number.isFinite(item.lineTotal) || item.lineTotal < 0 || item.lineTotal > 1_000_000_000)) {
      setError('Add a description and valid quantity and amounts for each line item.')
      return
    }

    const suppliedSubtotal = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0)
    const suppliedTax = Number(tax)
    const suppliedTotal = billTotal === '' ? suppliedSubtotal + suppliedTax : Number(billTotal)
    if (!Number.isFinite(suppliedTax) || suppliedTax < 0 || suppliedTax > 1_000_000_000 || !Number.isFinite(suppliedTotal) || suppliedTotal < 0 || suppliedTotal > 1_000_000_000) {
      setError('Tax and bill total must be valid non-negative amounts.')
      return
    }

    setSaving(true)
    try {
      const savedBill = await onSave({
        patientLabel: patientLabel.trim() || 'My bill',
        currency,
        items: normalizedItems,
        subtotal: suppliedSubtotal,
        tax: suppliedTax,
        total: suppliedTotal,
      })
      setResult(savedBill)
    } catch (saveError) {
      setError(saveError.message || 'Could not save this bill. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleExplain() {
    if (!result?.id) return
    setError('')
    setExplaining(true)
    try {
      const text = await onExplain(result.id)
      setExplanation(text)
    } catch (explainError) {
      setError(explainError.message || 'Could not create an explanation.')
    } finally {
      setExplaining(false)
    }
  }

  function resetForm() {
    setItems([blankItem()])
    setPatientLabel('')
    setCurrency('INR')
    setTax('0')
    setBillTotal('')
    setResult(null)
    setExplanation('')
    setError('')
  }

  return (
    <div className="analyzer-page">
      <header className="analyzer-topbar">
        <button className="back-button" type="button" onClick={onBack}>
          <span aria-hidden="true">←</span> Dashboard
        </button>
        <div className="analyzer-brand">
          <span className="brand-mark">+</span>
          <span>HealthCost <strong>AI</strong></span>
        </div>
        <span className="demo-label">{demoMode ? 'Local demo' : 'Bill checker'}</span>
      </header>

      <main className="analyzer-main">
        <section className="analyzer-intro">
          <div className="eyebrow"><span className="eyebrow-dot" /> BILL CHECKUP</div>
          <h1>Make every line add up.</h1>
          <p>Enter the amounts shown on your bill. We independently calculate the line totals and flag arithmetic differences for you to review.</p>
        </section>

        <form className="upload-card bill-entry-form" onSubmit={handleSubmit}>
          <div className="section-heading">
            <div>
              <h2>Bill details</h2>
              <p>Only the information you enter is used. No document is uploaded.</p>
            </div>
            {demoMode && <button className="secondary-button" type="button" onClick={loadExample}>Load example</button>}
          </div>

          <div className="bill-fields">
            <label>
              Report name
              <input value={patientLabel} onChange={event => setPatientLabel(event.target.value)} maxLength={100} placeholder="e.g. Hospital visit, October" />
            </label>
            <label>
              Currency
              <select value={currency} onChange={event => setCurrency(event.target.value)}>
                {currencyOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>

          <div className="bill-items-heading">
            <h3>Line items</h3>
            <span>Enter the billed amount as printed</span>
          </div>
          <div className="bill-items">
            {items.map((item, index) => (
              <div className="bill-item-row" key={index}>
                <label className="bill-description">
                  Description
                  <input value={item.description} onChange={event => updateItem(index, 'description', event.target.value)} maxLength={300} placeholder="e.g. Consultation" required />
                </label>
                <label>
                  Qty
                  <input type="number" min="0.01" max="1000000" step="any" value={item.quantity} onChange={event => updateItem(index, 'quantity', event.target.value)} required />
                </label>
                <label>
                  Unit price
                  <input type="number" min="0" max="1000000000" step="0.01" value={item.unitPrice} onChange={event => updateItem(index, 'unitPrice', event.target.value)} placeholder="0.00" required />
                </label>
                <label>
                  Billed amount
                  <input type="number" min="0" max="1000000000" step="0.01" value={item.lineTotal} onChange={event => updateItem(index, 'lineTotal', event.target.value)} placeholder="Auto" />
                </label>
                <button
                  className="remove-line-button"
                  type="button"
                  aria-label={`Remove line ${index + 1}`}
                  disabled={items.length === 1}
                  onClick={() => {
                    setItems(current => current.filter((_, itemIndex) => itemIndex !== index))
                    setResult(null)
                  }}
                >×</button>
              </div>
            ))}
          </div>
          <button className="add-line-button" type="button" onClick={() => setItems(current => [...current, blankItem()])}>+ Add another line item</button>

          <div className="bill-totals">
            <div className="calculated-total">
              <span>Calculated line-item subtotal</span>
              <strong>{formatCurrency(calculatedSubtotal, currency)}</strong>
            </div>
            <label>
              Tax / other charges
              <input type="number" min="0" max="1000000000" step="0.01" value={tax} onChange={event => setTax(event.target.value)} />
            </label>
            <label>
              Total shown on bill
              <input type="number" min="0" max="1000000000" step="0.01" value={billTotal} onChange={event => setBillTotal(event.target.value)} placeholder={formatCurrency(calculatedSubtotal + (Number(tax) || 0), currency)} />
            </label>
          </div>

          {error && <div className="analyzer-error" role="alert">{error}</div>}
          <div className="privacy-note">
            <span aria-hidden="true">ⓘ</span>
            <p><strong>Private by design:</strong> manual entries only. Demo data stays in this browser; signed-in reports are saved to your account.</p>
          </div>
          <button className="analyze-button" type="submit" disabled={saving}>
            {saving ? 'Checking your bill…' : 'Check and save bill'} <span aria-hidden="true">→</span>
          </button>
        </form>

        {result && (
          <section className="analysis-results" aria-live="polite">
            <div className="results-heading">
              <div>
                <div className="eyebrow"><span className="eyebrow-dot" /> BILL CHECK COMPLETE</div>
                <h2>{result.patientLabel || patientLabel || 'Your bill'}</h2>
                <p>Your report is saved. Review every difference with the provider.</p>
              </div>
              <span className={`sample-badge ${result.validation?.isConsistent ? 'bill-ok-badge' : ''}`}>
                {result.validation?.isConsistent ? 'TOTALS MATCH' : 'REVIEW DIFFERENCE'}
              </span>
            </div>
            <div className="result-summary-grid">
              <article className="result-summary-card"><span>Calculated total</span><strong>{formatCurrency(result.total, result.currency || currency)}</strong><small>Based on line items and tax</small></article>
              <article className="result-summary-card"><span>Line items</span><strong>{result.items?.length || items.length}</strong><small>Entered for this report</small></article>
              <article className="result-summary-card"><span>Arithmetic check</span><strong>{result.validation?.isConsistent ? 'Looks consistent' : `${result.validation?.discrepancies?.length || 0} difference(s)`}</strong><small>Not a price or coverage judgment</small></article>
            </div>
            <article className="results-card">
              <div className="results-card-heading"><div><h3>What we checked</h3><p>Calculated math only. We do not determine whether a charge is medically appropriate.</p></div></div>
              {result.validation?.discrepancies?.length ? (
                <ul className="difference-list">{result.validation.discrepancies.map((entry, index) => <li key={`${index}-${entry}`}>{entry}</li>)}</ul>
              ) : (
                <p className="no-difference-message">The entered line items, subtotal, and total are arithmetically consistent.</p>
              )}
              {!demoMode && (
                <label className="consent-check">
                  <input type="checkbox" id="ai-consent" />
                  I consent to send the bill line items I entered to the AI provider. Descriptions may contain sensitive information; my account email and report name are not sent.
                </label>
              )}
              {!demoMode && (
                <button
                  className="secondary-button explain-button"
                  type="button"
                  disabled={explaining}
                  onClick={() => {
                    if (!document.getElementById('ai-consent')?.checked) {
                      setError('Please give consent before requesting an AI explanation.')
                      return
                    }
                    handleExplain()
                  }}
                >{explaining ? 'Preparing explanation…' : 'Explain line items with AI'}</button>
              )}
              {demoMode && <p className="no-difference-message">AI explanations are disabled in local demo mode. No bill data leaves this browser.</p>}
              {explanation && <div className="explanation-box"><h3>Plain-language explanation</h3><p>{explanation}</p></div>}
              <div className="results-disclaimer"><strong>Important:</strong> This tool checks arithmetic, not medical necessity, fair pricing, insurance coverage, or fraud. Ask your billing office or insurer about uncertain charges.</div>
            </article>
            <button className="secondary-button new-analysis-button" type="button" onClick={resetForm}>Check another bill</button>
          </section>
        )}
      </main>
    </div>
  )
}
