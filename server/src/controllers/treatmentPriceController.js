const { z } = require('zod')
const { getCghsRates } = require('../services/cghsRateService')

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

module.exports = { searchTreatmentPrices }
