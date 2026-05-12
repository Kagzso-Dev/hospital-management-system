const router = require('express').Router();
const { superadminAuth } = require('../middleware/tenantAuth');
const {
  superadminLogin, listTenants, createTenant, updateTenantStatus, updateTenantPassword, updateTenantUsername, deleteTenant,
} = require('../controllers/superadminController');

router.post('/login', superadminLogin);
router.get('/tenants', superadminAuth, listTenants);
router.post('/tenants', superadminAuth, createTenant);
router.put('/tenants/:id/status', superadminAuth, updateTenantStatus);
router.put('/tenants/:id/password', superadminAuth, updateTenantPassword);
router.put('/tenants/:id/username', superadminAuth, updateTenantUsername);
router.delete('/tenants/:id', superadminAuth, deleteTenant);

module.exports = router;
