const router = require('express').Router();
const { tenantAuth } = require('../middleware/tenantAuth');
const { createPrescription, getPatientPrescriptions, getAppointmentPrescription } = require('../controllers/prescriptionController');
router.post('/', tenantAuth, createPrescription);
router.get('/appointment/:appointment_id', tenantAuth, getAppointmentPrescription);
router.get('/patient/:patient_id', tenantAuth, getPatientPrescriptions);
module.exports = router;
