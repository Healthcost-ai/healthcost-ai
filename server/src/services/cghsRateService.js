const CGHS_RATE_API = 'https://cghs.mohfw.gov.in/AHIMSG5/hislogin/getCghsRateListLgnFtr'
const CGHS_RATE_PAGE = 'https://cghs.mohfw.gov.in/AHIMSG5/hissso/cghsRateListLogin'
const CACHE_TTL_MS = 15 * 60 * 1000

const rateCache = new Map()
let cityCache
const hospitalCache = new Map()
const CGHS_HOSPITAL_API = 'https://cghs.mohfw.gov.in/AHIMSG5/hislogin'
const CGHS_HOSPITAL_PAGE = 'https://cghs.mohfw.gov.in/AHIMSG5/hissso/empanelledLogin'

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

async function fetchOfficialJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`CGHS directory returned status ${response.status}`)
  return response.json()
}

async function getCghsCities() {
  if (cityCache && cityCache.expiresAt > Date.now()) return cityCache.items

  const data = await fetchOfficialJson(`${CGHS_HOSPITAL_API}/getCityNamesLgnFtr?`)
  if (!Array.isArray(data.cityNamesDtl)) throw new Error('CGHS city directory returned invalid data')
  cityCache = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    items: data.cityNamesDtl.flatMap(city => {
      const id = String(city.cityId || '')
      const name = typeof city.cityName === 'string' ? city.cityName.trim() : ''
      return /^\d{1,8}$/.test(id) && name ? [{ id, name }] : []
    }),
  }
  return cityCache.items
}

async function getCghsHospitals(cityId) {
  const cities = await getCghsCities()
  const city = cities.find(item => item.id === cityId)
  if (!city) throw new Error('Invalid CGHS city')

  let result = hospitalCache.get(cityId)
  if (!result || result.expiresAt <= Date.now()) {
    const url = new URL(`${CGHS_HOSPITAL_API}/getHospitalsByCityLgnFtr`)
    url.searchParams.set('cityId', cityId)
    const data = await fetchOfficialJson(url)
    if (!Array.isArray(data.hospitalNamesDtl)) throw new Error('CGHS hospital directory returned invalid data')
    result = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      items: data.hospitalNamesDtl.flatMap(hospital => {
        const name = typeof hospital.hospName === 'string' ? hospital.hospName.trim() : ''
        if (!name) return []
        return [{
          name,
          city: typeof hospital.cityName === 'string' ? hospital.cityName : city.name,
          tier: typeof hospital.tierType === 'string' ? hospital.tierType : '',
          accreditation: typeof hospital.hospAcc === 'string' ? hospital.hospAcc : '',
        }]
      }),
      refreshedAt: new Date().toISOString(),
    }
    hospitalCache.set(cityId, result)
  }

  const sourceUrl = new URL(CGHS_HOSPITAL_PAGE)
  sourceUrl.searchParams.set('cityId', cityId)
  return {
    city,
    hospitals: result.items,
    sourceUrl: sourceUrl.toString(),
    sourceName: 'Central Government Health Scheme (CGHS), Ministry of Health and Family Welfare, Government of India',
    refreshedAt: result.refreshedAt,
  }
}

module.exports = { getCghsCities, getCghsHospitals, getCghsRates }
