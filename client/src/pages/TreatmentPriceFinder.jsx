import { useEffect, useState } from 'react'
import './TreatmentPriceFinder.css'
import { getCghsCities, getCghsHospitals, searchTreatmentPrices } from '../lib/api'

const tiers = [
  { value: 'tier_i', label: 'Tier I' },
  { value: 'tier_ii', label: 'Tier II' },
  { value: 'tier_iii', label: 'Tier III' },
]

const facilities = [
  { value: 'nabh', label: 'NABH' },
  { value: 'non_nabh', label: 'Non-NABH' },
  { value: 'superspeciality', label: 'Super-speciality' },
]

const wards = [
  { value: 'general_ward', label: 'General ward' },
  { value: 'semi_private_ward', label: 'Semi-private ward' },
  { value: 'private_ward', label: 'Private ward' },
]

function formatRupees(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function TreatmentPriceFinder({ onBack }) {
  const [query, setQuery] = useState('')
  const [tier, setTier] = useState('tier_i')
  const [facility, setFacility] = useState('nabh')
  const [ward, setWard] = useState('general_ward')
  const [results, setResults] = useState(null)
  const [selectedTreatment, setSelectedTreatment] = useState(null)
  const [cities, setCities] = useState([])
  const [citiesError, setCitiesError] = useState('')
  const [cityId, setCityId] = useState('')
  const [hospitalResults, setHospitalResults] = useState(null)
  const [hospitalError, setHospitalError] = useState('')
  const [hospitalFilter, setHospitalFilter] = useState('')
  const [suggestions, setSuggestions] = useState(null)
  const [suggestionsError, setSuggestionsError] = useState('')
  const [activeSuggestion, setActiveSuggestion] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const hospitalsLoading = Boolean(cityId && selectedTreatment && !hospitalResults && !hospitalError)
  const visibleHospitals = hospitalResults?.hospitals.filter(hospital => {
    const normalizedFilter = hospitalFilter.trim().toLocaleLowerCase('en-IN')
    return `${hospital.name} ${hospital.accreditation} ${hospital.tier} ${hospital.city}`
      .toLocaleLowerCase('en-IN')
      .includes(normalizedFilter)
  }) || []

  useEffect(() => {
    const controller = new AbortController()
    getCghsCities({ signal: controller.signal })
      .then(data => setCities(data.cities))
      .catch(citiesError => {
        if (citiesError.name !== 'AbortError') {
          setCitiesError(citiesError.message || 'Could not load official CGHS cities.')
        }
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!cityId || !selectedTreatment) return undefined
    const controller = new AbortController()
    getCghsHospitals(cityId, { signal: controller.signal })
      .then(setHospitalResults)
      .catch(hospitalLoadError => {
        if (hospitalLoadError.name !== 'AbortError') {
          setHospitalResults(null)
          setHospitalError(hospitalLoadError.message || 'Could not load official CGHS hospitals.')
        }
      })
    return () => controller.abort()
  }, [cityId, selectedTreatment])

  useEffect(() => {
    const trimmedQuery = query.trim()
    if (trimmedQuery.length < 2) return undefined

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setSuggestionsError('')
      try {
        const data = await searchTreatmentPrices(
          { query: trimmedQuery, tier, facility, ward },
          { signal: controller.signal },
        )
        setSuggestions(data)
        setActiveSuggestion(0)
      } catch (suggestionError) {
        if (suggestionError.name !== 'AbortError') {
          setSuggestions(null)
          setSuggestionsError(suggestionError.message || 'Could not load treatment suggestions.')
        }
      }
    }, 250)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [query, tier, facility, ward])

  function chooseSuggestion(rate) {
    if (!suggestions) return
    setSelectedTreatment(rate)
    setHospitalResults(null)
    setHospitalError('')
    setHospitalFilter('')
    setResults({
      ...suggestions,
      rates: [rate],
      total: 1,
    })
    setSuggestions(null)
    setSuggestionsError('')
    setError('')
  }

  async function handleSearch(event) {
    event.preventDefault()
    setError('')
    setSuggestions(null)
    setResults(null)
    setSelectedTreatment(null)
    setHospitalResults(null)
    setHospitalError('')
    if (query.trim().length < 2) {
      setError('Enter at least two characters to search treatments.')
      return
    }

    setLoading(true)
    try {
      setResults(await searchTreatmentPrices({ query: query.trim(), tier, facility, ward }))
    } catch (searchError) {
      setError(searchError.message || 'Could not load official treatment rates.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="treatment-finder-page">
      <header className="treatment-finder-topbar">
        <button className="treatment-back-button" type="button" onClick={onBack}>← Dashboard</button>
        <div className="treatment-finder-brand"><span aria-hidden="true">₹</span> Treatment Price Finder</div>
        <span className="treatment-source-badge">OFFICIAL CGHS DATA</span>
      </header>

      <main className="treatment-finder-main">
        <div className="treatment-finder-intro">
          <span className="treatment-finder-kicker">INDIA · GOVERNMENT RATE REFERENCE</span>
          <h1>Find a published treatment rate.</h1>
          <p>Search the Central Government Health Scheme rate list by treatment name or CGHS code.</p>
        </div>

        <section className="treatment-search-card" aria-labelledby="treatment-search-title">
          <div className="treatment-card-heading">
            <div><span>CGHS RATE LOOKUP</span><h2 id="treatment-search-title">Choose a treatment and rate category</h2></div>
          </div>
          <form onSubmit={handleSearch}>
            <div className="treatment-query-field">
              <label htmlFor="treatment-query">Treatment name or CGHS code</label>
              <input
                id="treatment-query"
                value={query}
                onChange={event => {
                  setQuery(event.target.value)
                  setResults(null)
                  setSelectedTreatment(null)
                  setHospitalResults(null)
                  setHospitalError('')
                  setSuggestions(null)
                  setSuggestionsError('')
                  setError('')
                }}
                onKeyDown={event => {
                  if (!suggestions?.rates.length) return
                  if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    setActiveSuggestion(index => (index + 1) % suggestions.rates.length)
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    setActiveSuggestion(index => (index - 1 + suggestions.rates.length) % suggestions.rates.length)
                  } else if (event.key === 'Enter') {
                    event.preventDefault()
                    chooseSuggestion(suggestions.rates[activeSuggestion])
                  } else if (event.key === 'Escape') {
                    setSuggestions(null)
                  }
                }}
                maxLength={80}
                minLength={2}
                placeholder="e.g. cataract, consultation, CN001"
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-controls="treatment-suggestions"
                aria-activedescendant={suggestions?.rates.length ? `treatment-suggestion-${activeSuggestion}` : undefined}
                aria-expanded={Boolean(suggestions?.rates.length)}
                required
              />
              {suggestions?.rates.length > 0 && (
                <div className="treatment-suggestions" id="treatment-suggestions" role="listbox" aria-label="Treatment suggestions">
                  {suggestions.rates.slice(0, 8).map((rate, index) => (
                    <button
                      className={`treatment-suggestion${activeSuggestion === index ? ' active' : ''}`}
                      type="button"
                      role="option"
                      aria-selected={activeSuggestion === index}
                      id={`treatment-suggestion-${index}`}
                      key={`${rate.code}-${index}`}
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => chooseSuggestion(rate)}
                    >
                      <span className="treatment-suggestion-main">
                        <strong>{rate.procedure}</strong>
                        <small>{rate.specialty || 'Other'} · {rate.code || 'No CGHS code'}</small>
                      </span>
                      <strong className="treatment-suggestion-rate">{formatRupees(rate.rate)}</strong>
                    </button>
                  ))}
                  {suggestions.total > 8 && <p className="treatment-suggestion-more">Showing 8 of {suggestions.total} matches. Refine your search.</p>}
                </div>
              )}
              {suggestionsError && <p className="treatment-suggestion-error" role="status">{suggestionsError}</p>}
            </div>
            <div className="treatment-filter-grid">
              <label>
                CGHS tier
                <select value={tier} onChange={event => {
                  setTier(event.target.value)
                  setSuggestions(null)
                }}>
                  {tiers.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label>
                Facility classification
                <select value={facility} onChange={event => {
                  setFacility(event.target.value)
                  setSuggestions(null)
                }}>
                  {facilities.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label>
                Ward category
                <select value={ward} onChange={event => {
                  setWard(event.target.value)
                  setSuggestions(null)
                }}>
                  {wards.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
            {error && <p className="treatment-finder-error" role="alert">{error}</p>}
            <button className="treatment-search-button" type="submit" disabled={loading}>
              {loading ? 'Loading official rates…' : 'Search treatment rates'} <span aria-hidden="true">→</span>
            </button>
          </form>
        </section>

        {results && (
          <section className="treatment-results" aria-live="polite">
            <div className="treatment-results-heading">
              <div><span>SEARCH RESULTS</span><h2>{results.total} matching {results.total === 1 ? 'rate' : 'rates'}</h2></div>
              <a href={results.sourceUrl} target="_blank" rel="noreferrer">View on official CGHS site ↗</a>
            </div>
            {results.total === 0 ? (
              <p className="treatment-no-results">No matching procedures found. Try a shorter term or search by code.</p>
            ) : (
              <>
                {results.total > results.rates.length && <p className="treatment-result-count">Showing the first {results.rates.length} results. Refine your search to narrow the list.</p>}
                <div className="treatment-results-table-wrap">
                  <table className="treatment-results-table">
                    <thead><tr><th>Procedure</th><th>Specialty</th><th>CGHS code</th><th>Published rate</th><th>Hospitals</th></tr></thead>
                    <tbody>
                      {results.rates.map((rate, index) => (
                        <tr key={`${rate.code}-${index}`}>
                          <td>{rate.procedure}</td>
                          <td>{rate.specialty || '—'}</td>
                          <td>{rate.code || '—'}</td>
                          <td>{formatRupees(rate.rate)}</td>
                          <td><button className="treatment-hospital-link" type="button" onClick={() => {
                            setSelectedTreatment(rate)
                            setHospitalResults(null)
                            setHospitalError('')
                            setHospitalFilter('')
                          }}>Find hospitals</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="treatment-source-note">
                  Source: {results.sourceName}. Rate list fetched {new Date(results.refreshedAt).toLocaleString()}.
                </p>
              </>
            )}
          </section>
        )}

        {selectedTreatment && (
        <section className="treatment-hospital-section" aria-live="polite">
          <div className="treatment-results-heading">
            <div><span>CGHS-EMPANELLED DIRECTORY</span><h2>Hospitals for your reference</h2></div>
            {hospitalResults && <a href={hospitalResults.sourceUrl} target="_blank" rel="noreferrer">Official CGHS directory ↗</a>}
          </div>
          <div className="treatment-selected-rate">
            <div><span>Selected procedure</span><strong>{selectedTreatment.procedure}</strong></div>
            <div><span>CGHS code</span><strong>{selectedTreatment.code || 'Not listed'}</strong></div>
            <div><span>Published rate</span><strong>{formatRupees(selectedTreatment.rate)}</strong></div>
          </div>
          <label className="treatment-city-select">
            Select CGHS city
            <select value={cityId} onChange={event => {
              setCityId(event.target.value)
              setHospitalResults(null)
              setHospitalError('')
              setHospitalFilter('')
            }}>
              <option value="">Choose a city</option>
              {cities.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}
            </select>
          </label>
          {citiesError && <p className="treatment-finder-error" role="alert">{citiesError}</p>}
          {hospitalError && <p className="treatment-finder-error" role="alert">{hospitalError}</p>}
          {hospitalsLoading && <p className="treatment-hospital-status" role="status">Loading official hospital directory…</p>}
          {hospitalResults && !hospitalsLoading && (
            <>
              <div className="treatment-hospital-toolbar">
                <p>{hospitalResults.hospitals.length} listed facilities in {hospitalResults.city.name}</p>
                <label>
                  Filter hospitals
                  <input value={hospitalFilter} onChange={event => setHospitalFilter(event.target.value)} placeholder="Hospital name or accreditation" />
                </label>
              </div>
              {visibleHospitals.length ? (
                <div className="treatment-hospital-list">
                  {visibleHospitals.map((hospital, index) => (
                    <article className="treatment-hospital-card" key={`${hospital.name}-${index}`}>
                      <div className="treatment-hospital-icon" aria-hidden="true">+</div>
                      <div><strong>{hospital.name}</strong><span>{hospital.city}</span></div>
                      <div className="treatment-hospital-tags">
                        {hospital.tier && <span>{hospital.tier}</span>}
                        {hospital.accreditation && <span>{hospital.accreditation}</span>}
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="treatment-no-results">No listed hospitals match that filter.</p>}
              <p className="treatment-source-note">Source: {hospitalResults.sourceName}. Directory fetched {new Date(hospitalResults.refreshedAt).toLocaleString()}.</p>
            </>
          )}
          <p className="treatment-hospital-disclaimer">The CGHS directory lists facilities for the selected city; it does not confirm that a particular facility currently performs the selected procedure or has availability. Contact the hospital and CGHS to verify service, empanelment, and rate applicability.</p>
        </section>
        )}

        <aside className="treatment-rate-disclaimer">
          <strong>Important: CGHS rates are not general hospital price estimates.</strong>
          <p>These are official CGHS rates for the selected tier, facility classification, and ward category. They may apply only under CGHS rules and are not a quote, guarantee of eligibility, insurer coverage decision, or estimate of what a non-CGHS patient will pay. Confirm current rates and applicability with CGHS and the provider.</p>
        </aside>
      </main>
    </div>
  )
}
