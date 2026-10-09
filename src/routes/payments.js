const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/payments');
const auth = require('../middleware/auth');

router.use(auth.isAdminOrMember);
router.get('/', paymentsController.index);

router.use(auth.isAdmin);
router.get('/create', paymentsController.createForm);
router.post('/create', paymentsController.create);
router.get('/:id/edit', paymentsController.editForm);
router.put('/:id', paymentsController.update);
router.post('/:id/update', paymentsController.update);
router.delete('/:id', paymentsController.delete);
router.post('/:id/delete', paymentsController.delete);

module.exports = router;
