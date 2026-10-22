const mongoose = require('mongoose')
const OpenAI = require('openai')
const Bill = require('../models/Bill')
const { loadEnv } = require('../config/env')

async function explainBill(req, res, next) {
  try {
    const env = loadEnv()
    if (!env.OPENAI_API_KEY) {
      return res.status(503).json({ success: false, message: 'AI explanations are not configured' })
    }
    if (req.body?.consentToExternalProcessing !== true) {
      return res.status(400).json({ success: false, message: 'Explicit consent to send selected bill details to the AI provider is required' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid bill ID' })
    }
    const bill = await Bill.findOne({ _id: req.params.id, userId: req.user._id })
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' })

    // Minimise data sent to the AI provider. Do not send account email, patient label,
    // IDs, dates, uploaded documents, or other direct identifiers.
    const safeBill = {
      currency: bill.currency,
      items: bill.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        calculatedLineTotal: item.calculatedLineTotal
      })),
      subtotal: bill.subtotal,
      tax: bill.tax,
      total: bill.total,
      arithmeticConsistent: bill.validation.isConsistent,
      arithmeticDiscrepancies: bill.validation.discrepancies
    }
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: 20000, maxRetries: 1 })
    const response = await client.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: 'system',
          content: 'Explain medical-bill line items in plain language for a patient in India. You are not a doctor, insurer, lawyer, or billing authority. Do not claim a charge is fraudulent, medically necessary, covered, or overpriced without verified evidence. Arithmetic discrepancies are computed by application code and must be described as arithmetic differences only. State uncertainty and recommend contacting the provider or insurer for clarification. Do not infer diagnoses.'
        },
        {
          role: 'user',
          content: `Explain these bill line items and suggest neutral questions the patient can ask the billing office. Do not recalculate or override the code-validated amounts. Data: ${JSON.stringify(safeBill)}`
        }
      ]
    })
    const explanation = response.choices?.[0]?.message?.content?.trim()
    if (!explanation) return res.status(502).json({ success: false, message: 'AI returned no explanation' })
    bill.aiExplanation = explanation.slice(0, 10000)
    bill.aiExplainedAt = new Date()
    bill.aiProcessingConsentAt = new Date()
    await bill.save()
    return res.json({ success: true, explanation: bill.aiExplanation, explainedAt: bill.aiExplainedAt })
  } catch (error) { next(error) }
}

module.exports = { explainBill }
