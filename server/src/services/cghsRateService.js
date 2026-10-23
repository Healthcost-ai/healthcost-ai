const CGHS_RATE_API = 'https://cghs.mohfw.gov.in/AHIMSG5/hislogin/getCghsRateListLgnFtr'
const CGHS_RATE_PAGE = 'https://cghs.mohfw.gov.in/AHIMSG5/hissso/cghsRateListLogin'
const CACHE_TTL_MS = 15 * 60 * 1000

const rateCache = new Map()

function getSourceUrl({ tier, facility, ward }) {
  const url = new URL(CGHS_RATE_PAGE)
  url.searchParams.set('tier', tier)
  url.searchParams.set('spaciality', facility)
  url.searchParams.set('ward', ward)
  return url.toString()
}

async function getCghsRates({ tier, facility, ward, query }) {
  const rateColumn = `${tier}_${facility}_${ward}`
  let rates = rateCache.get(rateColumn)

  if (!rates || rates.expiresAt <= Date.now()) {
    const url = new URL(CGHS_RATE_API)
    url.searchParams.set('inputCol', rateColumn)
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!response.ok) {
      throw new Error(`CGHS rate source returned status ${response.status}`)
    }

    const data = await response.json()
    if (!Array.isArray(data.rateListArray)) {
      throw new Error('CGHS rate source returned an invalid rate list')
    }

    rates = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      items: data.rateListArray.flatMap(item => {
        const rate = Number(item[rateColumn])
        const procedure = typeof item.cghs_treatment_procedure_investigation_list === 'string'
          ? item.cghs_treatment_procedure_investigation_list.trim()
          : ''
        if (!procedure || !Number.isFinite(rate) || rate < 0) return []
        return [{
          code: String(item.alphanumeric_code || ''),
          procedure,
          specialty: String(item.speciality_classification || ''),
          rate,
        }]
      }),
    }
    rateCache.set(rateColumn, rates)
  }

  const terms = query.toLocaleLowerCase('en-IN').split(/\s+/).filter(Boolean)
  const matches = rates.items.filter(item => {
    const searchable = `${item.code} ${item.procedure} ${item.specialty}`.toLocaleLowerCase('en-IN')
    return terms.every(term => searchable.includes(term))
  })
  matches.sort((left, right) => {
    const leftStarts = left.procedure.toLocaleLowerCase('en-IN').startsWith(query.toLocaleLowerCase('en-IN'))
    const rightStarts = right.procedure.toLocaleLowerCase('en-IN').startsWith(query.toLocaleLowerCase('en-IN'))
    return Number(rightStarts) - Number(leftStarts) || left.procedure.localeCompare(right.procedure, 'en-IN')
  })

  return {
    rates: matches.slice(0, 50),
    total: matches.length,
    sourceUrl: getSourceUrl({ tier, facility, ward }),
    sourceName: 'Central Government Health Scheme (CGHS), Ministry of Health and Family Welfare, Government of India',
    refreshedAt: new Date().toISOString(),
  }
}

module.exports = { getCghsRates }
