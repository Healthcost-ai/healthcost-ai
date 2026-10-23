const mongoose = require('mongoose')
const Bill = require('../models/Bill')
const { loadEnv } = require('../config/env')
const {
  AIProviderError,
  generateAIContent,
  getAIProviderConfig,
  getProviderErrorMessage,
} = require('../services/aiProvider')

async function explainBill(req, res, next) {
  try {
    const env = loadEnv()
    const provider = getAIProviderConfig(env)
    if (!provider.apiKey) {
      return res.status(503).json({ success: false, message: 'AI explanations are not configured. Add GEMINI_API_KEY to server/.env.' })
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
    const response = await generateAIContent({
      env,
      temperature: 0.2,
      maxOutputTokens: 700,
      systemInstruction: 'Explain medical-bill line items in plain language for a patient in India. You are not a doctor, insurer, lawyer, or billing authority. Do not claim a charge is fraudulent, medically necessary, covered, or overpriced without verified evidence. Arithmetic discrepancies are computed by application code and must be described as arithmetic differences only. State uncertainty and recommend contacting the provider or insurer for clarification. Do not infer diagnoses.',
      userContent: `Explain these bill line items and suggest neutral questions the patient can ask the billing office. Do not recalculate or override the code-validated amounts. Data: ${JSON.stringify(safeBill)}`,
    })
    const explanation = response.text
    if (!explanation) return res.status(502).json({ success: false, message: 'AI returned no explanation' })
    bill.aiExplanation = explanation.slice(0, 10000)
    bill.aiExplainedAt = new Date()
    bill.aiProcessingConsentAt = new Date()
    await bill.save()
    return res.json({ success: true, explanation: bill.aiExplanation, explainedAt: bill.aiExplainedAt })
  } catch (error) {
    if (error instanceof AIProviderError) {
      const env = loadEnv()
      const provider = getAIProviderConfig(env)
      req.log?.error({
        status: error.status,
        code: error.code,
        type: error.type,
        requestId: error.requestID || error.requestId,
        provider: provider.provider,
        model: provider.model,
      }, 'AI bill explanation request failed')
      return res.status(502).json({
        success: false,
        message: getProviderErrorMessage(error),
      })
    }
    next(error)
  }
}

module.exports = { explainBill }
