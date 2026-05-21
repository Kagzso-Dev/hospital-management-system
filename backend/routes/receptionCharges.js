const router = require('express').Router();
const { tenantAuth } = require('../middleware/tenantAuth');
const { createReceptionCharge, listReceptionCharges, getReceptionChargeSummary } = require('../controllers/receptionChargeController');

router.post('/', tenantAuth, createReceptionCharge);
router.get('/', tenantAuth, listReceptionCharges);
router.get('/summary', tenantAuth, getReceptionChargeSummary);

module.exports = router;
