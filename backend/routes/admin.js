const router = require('express').Router();
const { tenantAuth } = require('../middleware/tenantAuth');
const {
  getDoctors, getDateAvailability, setDateAvailability, setWeeklySchedule,
  getDateAppointments, reassignAppointments, deleteDoctor, resetDoctorPassword, getAnalytics,
} = require('../controllers/adminController');

router.get('/doctors', tenantAuth, getDoctors);
router.delete('/doctors/:id', tenantAuth, deleteDoctor);
router.put('/doctors/:id/password', tenantAuth, resetDoctorPassword);
router.get('/analytics', tenantAuth, getAnalytics);
router.get('/availability', tenantAuth, getDateAvailability);
router.put('/availability/date', tenantAuth, setDateAvailability);
router.put('/availability/weekly', tenantAuth, setWeeklySchedule);
router.get('/appointments', tenantAuth, getDateAppointments);
router.post('/reassign', tenantAuth, reassignAppointments);

module.exports = router;
