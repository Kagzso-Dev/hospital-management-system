const router = require('express').Router();
const { tenantAuth } = require('../middleware/tenantAuth');
const { createPayment, getPayment, listPayments, getDailySummary } = require('../controllers/paymentController');
router.get('/summary', tenantAuth, getDailySummary);
router.get('/', tenantAuth, listPayments);
router.post('/', tenantAuth, createPayment);
router.get('/:appointment_id', tenantAuth, getPayment);
module.exports = router;
