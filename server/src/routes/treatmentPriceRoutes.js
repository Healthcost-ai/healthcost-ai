const express = require('express')
const {
  listCghsCities,
  listCghsHospitals,
  searchTreatmentPrices,
} = require('../controllers/treatmentPriceController')

const router = express.Router()

router.get('/hospitals/cities', listCghsCities)
router.get('/hospitals', listCghsHospitals)
router.get('/', searchTreatmentPrices)

module.exports = router
