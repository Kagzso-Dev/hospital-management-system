const router = require('express').Router();
const { tenantAuth } = require('../middleware/tenantAuth');
const { getAppointments, createAppointment, updateStatus } = require('../controllers/appointmentController');
router.get('/', tenantAuth, getAppointments);
router.post('/', tenantAuth, createAppointment);
router.put('/:id/status', tenantAuth, updateStatus);
module.exports = router;
