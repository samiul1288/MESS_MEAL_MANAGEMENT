const express = require('express');
const groupsController = require('../controllers/groups');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth.isAdmin);
router.get('/', groupsController.index);
router.get('/create', groupsController.createForm);
router.post('/', groupsController.create);
router.get('/:id/edit', groupsController.editForm);
router.post('/:id/update', groupsController.update);
router.post('/:id/delete', groupsController.delete);

module.exports = router;
