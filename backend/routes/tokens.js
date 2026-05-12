const router = require('express').Router();
const { tenantAuth } = require('../middleware/tenantAuth');
const { getTokenDisplay, getAllTokensDisplay } = require('../controllers/tokenController');
// /display is public — used on TV screens by doctor_id (globally unique PK)
router.get('/display', getTokenDisplay);
router.get('/display/all', tenantAuth, getAllTokensDisplay);
module.exports = router;
