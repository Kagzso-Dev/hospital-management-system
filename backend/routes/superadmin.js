const router = require('express').Router();
const { superadminAuth } = require('../middleware/tenantAuth');
const {
  superadminLogin, listTenants, createTenant, updateTenantStatus, updateTenantPassword, updateTenantUsername, updateTenantName, deleteTenant, toggleTenantSmartPad, toggleTenantOcr,
} = require('../controllers/superadminController');

router.post('/login', superadminLogin);
router.get('/tenants', superadminAuth, listTenants);
router.post('/tenants', superadminAuth, createTenant);
router.put('/tenants/:id/status', superadminAuth, updateTenantStatus);
router.put('/tenants/:id/password', superadminAuth, updateTenantPassword);
router.put('/tenants/:id/username', superadminAuth, updateTenantUsername);
router.put('/tenants/:id/name', superadminAuth, updateTenantName);
router.delete('/tenants/:id', superadminAuth, deleteTenant);
router.put('/tenants/:id/smart-pad', superadminAuth, toggleTenantSmartPad);
router.put('/tenants/:id/ocr', superadminAuth, toggleTenantOcr);

module.exports = router;
