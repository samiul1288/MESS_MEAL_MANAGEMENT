const express = require('express');
const router = express.Router();
const mealsController = require('../controllers/meals');
const auth = require('../middleware/auth');

router.use(auth.isAdminOrMember);

router.get('/', mealsController.index);
router.get('/create', mealsController.createForm);
router.post('/create', mealsController.create);

router.get('/:id/edit', auth.isAdmin, mealsController.editForm);
router.put('/:id', auth.isAdmin, mealsController.update);
router.post('/:id/update', auth.isAdmin, mealsController.update);
router.delete('/:id', auth.isAdmin, mealsController.delete);
router.post('/:id/delete', auth.isAdmin, mealsController.delete);

module.exports = router;
