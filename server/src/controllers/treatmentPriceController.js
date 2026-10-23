const { z } = require('zod')
const { getCghsCities, getCghsHospitals, getCghsRates } = require('../services/cghsRateService')

const searchSchema = z.object({
  query: z.string().trim().min(2).max(80),
  tier: z.enum(['tier_i', 'tier_ii', 'tier_iii']),
  facility: z.enum(['nabh', 'non_nabh', 'superspeciality']),
  ward: z.enum(['general_ward', 'semi_private_ward', 'private_ward']),
}).strict()

async function searchTreatmentPrices(req, res, next) {
  const parsed = searchSchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Enter a treatment name or CGHS code and choose valid rate options.',
    })
  }

  try {
    const result = await getCghsRates(parsed.data)
    return res.json({ success: true, ...result })
  } catch (error) {
    req.log?.error({ message: error.message }, 'CGHS treatment rate lookup failed')
    return res.status(502).json({
      success: false,
      message: 'The official CGHS rate list is temporarily unavailable. Please try again later.',
    })
  }
}

async function listCghsCities(req, res) {
  try {
    const cities = await getCghsCities()
    return res.json({ success: true, cities })
  } catch (error) {
    req.log?.error({ message: error.message }, 'CGHS city directory lookup failed')
    return res.status(502).json({
      success: false,
      message: 'The official CGHS city list is temporarily unavailable. Please try again later.',
    })
  }
}

async function listCghsHospitals(req, res) {
  const parsed = z.string().regex(/^\d{1,8}$/).safeParse(req.query.cityId)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Choose a valid CGHS city.' })
  }

  try {
    const result = await getCghsHospitals(parsed.data)
    return res.json({ success: true, ...result })
  } catch (error) {
    if (error.message === 'Invalid CGHS city') {
      return res.status(400).json({ success: false, message: 'Choose a valid CGHS city.' })
    }
    req.log?.error({ message: error.message }, 'CGHS hospital directory lookup failed')
    return res.status(502).json({
      success: false,
      message: 'The official CGHS hospital list is temporarily unavailable. Please try again later.',
    })
  }
}

module.exports = { listCghsCities, listCghsHospitals, searchTreatmentPrices }
