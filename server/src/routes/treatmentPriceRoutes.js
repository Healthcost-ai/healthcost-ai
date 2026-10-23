const express = require('express')
const { searchTreatmentPrices } = require('../controllers/treatmentPriceController')

const router = express.Router()

router.get('/', searchTreatmentPrices)

module.exports = router
