
import './AnalysisPreview.css'

const sampleItems = [
  { name: 'Consultation', amount: 800 },
  { name: 'Blood test', amount: 650 },
  { name: 'Medication', amount: 1200 },
  { name: 'Room charges', amount: 2200 },
]

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)

function AnalysisPreview({ fileName, onChooseAnother }) {
  const itemTotal = sampleItems.reduce(
    (total, item) => total + item.amount,
    0
  )

  return (
    <section className="analysis-preview" id="analysis-results">
      <div className="analysis-preview-header">
        <div>
          <span className="analysis-kicker">ANALYSIS PREVIEW</span>
          <h2>Bill analysis</h2>
          <p className="analysis-file-name">
            Selected file: {fileName}
          </p>
        </div>

        <span className="analysis-demo-badge">DEMO</span>
      </div>

      <div className="analysis-demo-notice" role="status">
        <strong>Sample results only</strong>
        <p>
          These example charges are not extracted from your uploaded
          file. Actual PDF/image processing and AI analysis will be
          connected through the backend later.
        </p>
      </div>

      <div className="analysis-total-card">
        <span>Example item total</span>
        <strong>{formatCurrency(itemTotal)}</strong>
        <small>Calculated from the sample line items below</small>
      </div>

      <div className="analysis-table-wrap">
        <h3>Example bill items</h3>

        <table className="analysis-table">
          <thead>
            <tr>
              <th scope="col">Description</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>

          <tbody>
            {sampleItems.map((item) => (
              <tr key={item.name}>
                <td>{item.name}</td>
                <td>{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <th scope="row">Sample item total</th>
              <th>{formatCurrency(itemTotal)}</th>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="analysis-next-step">
        <h3>What happens next?</h3>
        <p>
          Once the backend is connected, HealthCost AI can process the
          selected bill, extract its actual line items, validate the
          arithmetic, and provide explanations.
        </p>

        <button type="button" onClick={onChooseAnother}>
          Choose another bill
        </button>
      </div>
    </section>
  )
}

export default AnalysisPreview
