
function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function isValidAmount(value) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1000000000
  )
}

function validateBill(input) {
  const errors = []
  const discrepancies = []

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      valid: false,
      errors: ['A bill object is required'],
    }
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    return {
      valid: false,
      errors: ['At least one bill item is required'],
    }
  }

  if (input.items.length > 500) {
    return {
      valid: false,
      errors: ['A maximum of 500 bill items is allowed'],
    }
  }

  if (!isValidAmount(input.tax)) {
    errors.push('Tax must be a non-negative valid amount')
  }

  if (!isValidAmount(input.subtotal)) {
    errors.push('Subtotal must be a non-negative valid amount')
  }

  if (!isValidAmount(input.total)) {
    errors.push('Total must be a non-negative valid amount')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  let calculatedSubtotal = 0
  const checkedItems = []

  for (let index = 0; index < input.items.length; index++) {
    const item = input.items[index]

    if (!item || typeof item !== 'object') {
      errors.push(`Item ${index + 1} must be an object`)
      continue
    }

    const { description, quantity, unitPrice, lineTotal } = item

    if (
      typeof description !== 'string' ||
      !description.trim() ||
      description.length > 300
    ) {
      errors.push(`Item ${index + 1} has an invalid description`)
      continue
    }

    if (
      typeof quantity !== 'number' ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      quantity > 1000000
    ) {
      errors.push(`Item ${index + 1} has an invalid quantity`)
      continue
    }

    if (!isValidAmount(unitPrice) || !isValidAmount(lineTotal)) {
      errors.push(`Item ${index + 1} has an invalid amount`)
      continue
    }

    const expectedLineTotal = roundMoney(quantity * unitPrice)
    const submittedLineTotal = roundMoney(lineTotal)

    if (Math.abs(expectedLineTotal - submittedLineTotal) > 0.01) {
      discrepancies.push(
        `Item ${index + 1} (${description}): expected ${expectedLineTotal.toFixed(2)}, received ${submittedLineTotal.toFixed(2)}`
      )
    }

    calculatedSubtotal = roundMoney(
      calculatedSubtotal + expectedLineTotal
    )

    checkedItems.push({
      description: description.trim(),
      quantity,
      unitPrice: roundMoney(unitPrice),
      lineTotal: submittedLineTotal,
      calculatedLineTotal: expectedLineTotal,
    })
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  if (Math.abs(calculatedSubtotal - roundMoney(input.subtotal)) > 0.01) {
    discrepancies.push(
      `Subtotal: expected ${calculatedSubtotal.toFixed(2)}, received ${roundMoney(input.subtotal).toFixed(2)}`
    )
  }

  const calculatedTotal = roundMoney(calculatedSubtotal + input.tax)

  if (Math.abs(calculatedTotal - roundMoney(input.total)) > 0.01) {
    discrepancies.push(
      `Grand total: expected ${calculatedTotal.toFixed(2)}, received ${roundMoney(input.total).toFixed(2)}`
    )
  }

  return {
    valid: true,
    isConsistent: discrepancies.length === 0,
    discrepancies,
    checkedItems,
    calculatedSubtotal,
    calculatedTax: roundMoney(input.tax),
    calculatedTotal,
  }
}

module.exports = { validateBill, roundMoney }
