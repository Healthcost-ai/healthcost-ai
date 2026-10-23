import { useState } from 'react'
import './PersonalSavingsDashboard.css'

const currencyOptions = ['INR', 'USD', 'GBP', 'EUR']
const chartColors = ['#07865b', '#4888d4', '#b184e8', '#e9a343', '#e26767', '#5d9d9e']

function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0)
}

function getPotentialArithmeticDifference(bills) {
  return bills
    .filter(bill => bill.currency === 'INR')
    .reduce((billTotal, bill) => billTotal + (bill.items || []).reduce((itemTotal, item) => {
      const billed = Number(item.submittedLineTotal ?? item.lineTotal ?? item.calculatedLineTotal)
      const calculated = Number(item.calculatedLineTotal ?? item.lineTotal ?? item.submittedLineTotal)
      if (!Number.isFinite(billed) || !Number.isFinite(calculated)) return itemTotal
      return itemTotal + Math.max(0, billed - calculated)
    }, 0), 0)
}

function makePieGradient(values) {
  const total = values.reduce((sum, value) => sum + value, 0)
  if (!total) return 'conic-gradient(#e8eeea 0deg 360deg)'
  let currentAngle = 0
  const slices = values.map((value, index) => {
    const startAngle = currentAngle
    currentAngle += value / total * 360
    return `${chartColors[index % chartColors.length]} ${startAngle}deg ${currentAngle}deg`
  })
  return `conic-gradient(${slices.join(', ')})`
}

export default function PersonalSavingsDashboard({
  bills,
  records,
  loading,
  onAddManualRecord,
  onDeleteRecord,
  onFindRates,
}) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const confirmedRecords = records.filter(record => record.recordType === 'confirmed')
  const confirmedByCurrency = currencyOptions.map(code => ({
    currency: code,
    total: confirmedRecords
      .filter(record => record.currency === code)
      .reduce((sum, record) => sum + Number(record.amount || 0), 0),
  })).filter(entry => entry.total > 0)
  const potentialArithmeticDifference = getPotentialArithmeticDifference(bills)
  const comparisonRecords = records.filter(record => record.recordType === 'cghs_comparison')
  const [chartCurrency, setChartCurrency] = useState('INR')
  const currencySavings = confirmedRecords.filter(record => record.currency === chartCurrency)
  const groupedSavings = currencySavings.reduce((groups, record) => {
    const label = record.title.trim() || 'Other'
    groups[label] = (groups[label] || 0) + Number(record.amount || 0)
    return groups
  }, {})
  const sortedSavings = Object.entries(groupedSavings).sort((left, right) => right[1] - left[1])
  const pieSavings = sortedSavings.length > 6
    ? [...sortedSavings.slice(0, 5), ['Other entries', sortedSavings.slice(5).reduce((sum, [, value]) => sum + value, 0)]]
    : sortedSavings
  const consistentBills = bills.filter(bill => bill.validation?.isConsistent).length
  const reviewBills = bills.length - consistentBills
  const billStatusSlices = [
    { label: 'Math consistent', value: consistentBills, color: chartColors[0] },
    { label: 'Needs arithmetic review', value: reviewBills, color: chartColors[4] },
  ].filter(slice => slice.value > 0)
  const monthlySavings = Array.from({ length: 6 }, (_, index) => {
    const month = new Date()
    month.setDate(1)
    month.setMonth(month.getMonth() - (5 - index))
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
    const total = currencySavings.reduce((sum, record) => {
      const date = new Date(record.createdAt)
      const recordMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      return recordMonth === key ? sum + Number(record.amount || 0) : sum
    }, 0)
    return { key, label: month.toLocaleDateString('en-IN', { month: 'short' }), total }
  })
  const monthlyMax = Math.max(...monthlySavings.map(month => month.total), 0)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const numericAmount = Number(amount)
    if (!title.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 1_000_000_000) {
      setError('Enter a description and a valid positive savings amount.')
      return
    }
    setSaving(true)
    try {
      await onAddManualRecord({ recordType: 'confirmed', title: title.trim(), amount: numericAmount, currency })
      setTitle('')
      setAmount('')
    } catch (saveError) {
      setError(saveError.message || 'Could not save this record.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="personal-savings" id="savings">
      <div className="personal-savings-heading">
        <div>
          <div className="section-kicker">PERSONAL HEALTHCARE SAVINGS</div>
          <h2>Your savings, with context</h2>
          <p>Track confirmed savings and review bill arithmetic and CGHS comparisons separately.</p>
        </div>
        <button type="button" className="text-button" onClick={onFindRates}>Compare a CGHS rate <span>→</span></button>
      </div>

      <div className="savings-metrics">
        <article className="savings-metric savings-metric-confirmed">
          <span>CONFIRMED SAVINGS YOU LOGGED</span>
          {confirmedByCurrency.length ? confirmedByCurrency.map(entry => (
            <strong key={entry.currency}>{formatCurrency(entry.total, entry.currency)}</strong>
          )) : <strong>{formatCurrency(0)}</strong>}
          <p>Self-reported amounts; not independently verified.</p>
        </article>
        <article className="savings-metric savings-metric-potential">
          <span>POTENTIAL BILL MATH DIFFERENCES</span>
          <strong>{formatCurrency(potentialArithmeticDifference)}</strong>
          <p>Positive line-item arithmetic differences from loaded INR reports only. Not confirmed savings.</p>
        </article>
        <article className="savings-metric savings-metric-reference">
          <span>CGHS RATE COMPARISONS</span>
          <strong>{comparisonRecords.length}</strong>
          <p>Reference comparisons are estimates, not general market prices or savings claims.</p>
        </article>
      </div>

      <div className="savings-charts">
        <article className="savings-chart-card">
          <div className="savings-chart-heading">
            <div><h3>Confirmed savings breakdown</h3><p>Based on entries you marked as confirmed.</p></div>
            <label>
              Currency
              <select value={chartCurrency} onChange={event => setChartCurrency(event.target.value)}>
                {currencyOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>
          {pieSavings.length ? (
            <div className="savings-pie-layout">
              <div className="savings-pie" role="img" aria-label={`${pieSavings.length} confirmed savings categories in ${chartCurrency}`} style={{ background: makePieGradient(pieSavings.map(([, value]) => value)) }}>
                <div><strong>{formatCurrency(pieSavings.reduce((sum, [, value]) => sum + value, 0), chartCurrency)}</strong><span>confirmed</span></div>
              </div>
              <ul className="savings-chart-legend">
                {pieSavings.map(([label, value], index) => (
                  <li key={label}><span style={{ '--legend-color': chartColors[index % chartColors.length] }} /><span>{label}</span><strong>{formatCurrency(value, chartCurrency)}</strong></li>
                ))}
              </ul>
            </div>
          ) : <p className="savings-chart-empty">Log confirmed savings in {chartCurrency} to see the breakdown.</p>}
        </article>

        <article className="savings-chart-card">
          <div className="savings-chart-heading">
            <div><h3>Saved bill arithmetic checks</h3><p>Report counts, not medical or price judgments.</p></div>
          </div>
          {bills.length ? (
            <div className="savings-pie-layout">
              <div className="savings-pie savings-status-pie" role="img" aria-label={`${consistentBills} arithmetically consistent reports and ${reviewBills} reports with differences`} style={{ background: makePieGradient(billStatusSlices.map(slice => slice.value)) }}>
                <div><strong>{bills.length}</strong><span>reports</span></div>
              </div>
              <ul className="savings-chart-legend">
                {billStatusSlices.map(slice => (
                  <li key={slice.label}><span style={{ '--legend-color': slice.color }} /><span>{slice.label}</span><strong>{slice.value}</strong></li>
                ))}
              </ul>
            </div>
          ) : <p className="savings-chart-empty">Save bill reports to see their arithmetic-check breakdown.</p>}
        </article>
      </div>

      <article className="savings-chart-card savings-monthly-chart">
        <div className="savings-chart-heading">
          <div><h3>Confirmed savings by month</h3><p>Last six months · {chartCurrency} · based on entries you logged.</p></div>
        </div>
        {monthlyMax > 0 ? (
          <div className="savings-bar-chart" role="img" aria-label={`Confirmed ${chartCurrency} savings by month for the last six months`}>
            {monthlySavings.map(month => (
              <div className="savings-bar-column" key={month.key}>
                <strong>{month.total ? formatCurrency(month.total, chartCurrency) : '—'}</strong>
                <div className="savings-bar-track"><span style={{ height: `${month.total ? Math.max(5, month.total / monthlyMax * 100) : 0}%` }} /></div>
                <span>{month.label}</span>
              </div>
            ))}
          </div>
        ) : <p className="savings-chart-empty savings-chart-empty-short">Log confirmed savings in the past six months to see a trend.</p>}
      </article>

      <div className="savings-content-grid">
        <form className="savings-entry-form" onSubmit={handleSubmit}>
          <div>
            <h3>Log confirmed savings</h3>
            <p>Record an amount you actually saved, for example after a corrected bill or discount.</p>
          </div>
          <label>
            What led to the savings?
            <input value={title} onChange={event => setTitle(event.target.value)} maxLength={200} required placeholder="e.g. Billing correction after review" />
          </label>
          <div className="savings-amount-fields">
            <label>
              Amount
              <input type="number" value={amount} onChange={event => setAmount(event.target.value)} min="0.01" max="1000000000" step="0.01" required placeholder="0.00" />
            </label>
            <label>
              Currency
              <select value={currency} onChange={event => setCurrency(event.target.value)}>
                {currencyOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>
          {error && <p className="savings-form-error" role="alert">{error}</p>}
          <button className="primary-button savings-submit" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add confirmed savings'}</button>
        </form>

        <div className="savings-records">
          <div className="savings-records-heading"><h3>Savings activity</h3><span>{loading ? 'Loading…' : `${records.length} records`}</span></div>
          {loading ? <p className="savings-empty">Loading savings records…</p> : records.length === 0 ? (
            <p className="savings-empty">No savings tracked yet. Log confirmed savings or compare a treatment with its CGHS reference rate.</p>
          ) : (
            <div className="savings-record-list">
              {records.map(record => (
                <article className="savings-record" key={record.id}>
                  <div className="savings-record-icon" aria-hidden="true">{record.recordType === 'confirmed' ? '✓' : '₹'}</div>
                  <div className="savings-record-details">
                    <strong>{record.title}</strong>
                    {record.recordType === 'confirmed' ? (
                      <span>Confirmed by you · {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'Saved'}</span>
                    ) : (
                      <>
                        <span>CGHS reference {formatCurrency(record.referenceAmount, 'INR')} · {record.rateCategory} · {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'Saved'}</span>
                        <span>Bill amount {formatCurrency(record.amount, 'INR')} · {record.cghsCode ? `Code ${record.cghsCode}` : 'No code supplied'}</span>
                      </>
                    )}
                  </div>
                  <div className="savings-record-amount">
                    {record.recordType === 'confirmed' ? formatCurrency(record.amount, record.currency) : (
                      <span className={record.amount > record.referenceAmount ? 'benchmark-higher' : 'benchmark-lower'}>
                        {record.amount > record.referenceAmount ? '+' : record.amount < record.referenceAmount ? '−' : ''}
                        {formatCurrency(Math.abs(record.amount - record.referenceAmount), 'INR')}
                      </span>
                    )}
                    <small>{record.recordType === 'confirmed' ? 'logged saving' : 'bill vs CGHS rate'}</small>
                  </div>
                  <button className="savings-delete" type="button" aria-label={`Delete ${record.title}`} title="Delete record" onClick={() => onDeleteRecord(record.id)}>×</button>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="savings-disclaimer">A bill arithmetic difference does not prove an overcharge. CGHS rates are applicable only under CGHS rules and are not a general provider price estimate. Verify every amount and any correction directly with the provider.</p>
    </section>
  )
}
