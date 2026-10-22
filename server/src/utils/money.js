// Use integer minor units (paise/cents) for sums to avoid binary floating-point drift.
function toMinorUnits(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1_000_000_000) {
    throw new Error('Invalid monetary amount')
  }
  return Math.round((value + Number.EPSILON) * 100)
}

function fromMinorUnits(value) {
  return Number((value / 100).toFixed(2))
}

module.exports = { toMinorUnits, fromMinorUnits }
