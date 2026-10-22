const { z } = require('zod')
const { toMinorUnits, fromMinorUnits } = require('./money')

const itemSchema = z.object({
  description: z.string().trim().min(1).max(300),
  quantity: z.number().finite().positive().max(1_000_000),
  unitPrice: z.number().finite().nonnegative().max(1_000_000_000),
  lineTotal: z.number().finite().nonnegative().max(1_000_000_000)
}).strict()

const billInputSchema = z.object({
  patientLabel: z.string().trim().min(1).max(100).optional().default('My bill'),
  currency: z.enum(['INR', 'USD', 'GBP', 'EUR']).default('INR'),
  items: z.array(itemSchema).min(1).max(500),
  subtotal: z.number().finite().nonnegative().max(1_000_000_000),
  tax: z.number().finite().nonnegative().max(1_000_000_000).default(0),
  total: z.number().finite().nonnegative().max(1_000_000_000)
}).strict()

function validateBill(input) {
  const parsed = billInputSchema.safeParse(input)
  if (!parsed.success) {
    return { valid: false, errors: parsed.error.issues.map(i => `${i.path.join('.') || 'body'}: ${i.message}`) }
  }

  const bill = parsed.data
  const discrepancies = []
  let subtotalMinor = 0
  const checkedItems = []

  for (let i = 0; i < bill.items.length; i++) {
    const item = bill.items[i]
    const expected = Math.round(item.quantity * toMinorUnits(item.unitPrice))
    const supplied = toMinorUnits(item.lineTotal)
    if (Math.abs(expected - supplied) > 1) {
      discrepancies.push(`Item ${i + 1} (${item.description}): expected ${fromMinorUnits(expected).toFixed(2)}, received ${fromMinorUnits(supplied).toFixed(2)}`)
    }
    subtotalMinor += expected
    checkedItems.push({
      description: item.description,
      quantity: item.quantity,
      unitPrice: fromMinorUnits(toMinorUnits(item.unitPrice)),
      submittedLineTotal: fromMinorUnits(supplied),
      calculatedLineTotal: fromMinorUnits(expected)
    })
  }

  const suppliedSubtotal = toMinorUnits(bill.subtotal)
  if (Math.abs(subtotalMinor - suppliedSubtotal) > 1) {
    discrepancies.push(`Subtotal: expected ${fromMinorUnits(subtotalMinor).toFixed(2)}, received ${fromMinorUnits(suppliedSubtotal).toFixed(2)}`)
  }

  const taxMinor = toMinorUnits(bill.tax)
  const expectedTotal = subtotalMinor + taxMinor
  const suppliedTotal = toMinorUnits(bill.total)
  if (Math.abs(expectedTotal - suppliedTotal) > 1) {
    discrepancies.push(`Grand total: expected ${fromMinorUnits(expectedTotal).toFixed(2)}, received ${fromMinorUnits(suppliedTotal).toFixed(2)}`)
  }

  return {
    valid: true,
    isConsistent: discrepancies.length === 0,
    discrepancies,
    items: checkedItems,
    calculatedSubtotal: fromMinorUnits(subtotalMinor),
    tax: fromMinorUnits(taxMinor),
    calculatedTotal: fromMinorUnits(expectedTotal),
    currency: bill.currency,
    patientLabel: bill.patientLabel
  }
}

module.exports = { validateBill, billInputSchema }
