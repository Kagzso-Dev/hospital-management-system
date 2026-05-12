const router = require('express').Router();
const { tenantAuth } = require('../middleware/tenantAuth');
const { searchPatients, createPatient, getPatient } = require('../controllers/patientController');
router.get('/', tenantAuth, searchPatients);
router.post('/', tenantAuth, createPatient);
router.get('/:id', tenantAuth, getPatient);
module.exports = router;
