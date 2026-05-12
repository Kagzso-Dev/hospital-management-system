const router = require('express').Router();
const { tenantLogin } = require('../controllers/authController');
router.post('/login', tenantLogin);
module.exports = router;
