const express = require('express');
const router = express.Router();
const expensesController = require('../controllers/expenses');
const auth = require('../middleware/auth');

router.use(auth.isAdmin);

router.get('/', expensesController.index);
router.get('/create', expensesController.createForm);
router.post('/create', expensesController.create);
router.get('/:id/edit', expensesController.editForm);
router.put('/:id', expensesController.update);
router.post('/:id/update', expensesController.update);
router.delete('/:id', expensesController.delete);
router.post('/:id/delete', expensesController.delete);

module.exports = router;
