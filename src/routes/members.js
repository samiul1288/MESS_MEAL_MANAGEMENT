// ============================================================
// MessMate — Routes: Members
// ============================================================

const express = require('express');
const router = express.Router();
const membersController = require('../controllers/members');
const authMiddleware = require('../middleware/auth');

// All member routes require authentication
router.use(authMiddleware.isAdminOrMember);

// GET /members — List members
router.get('/', membersController.index);

router.use(authMiddleware.isAdmin);

// GET /members/create — Show create form
router.get('/create', membersController.createForm);

// POST /members/create — Create member
router.post('/create', membersController.create);

// GET /members/:id/edit — Show edit form
router.get('/:id/edit', membersController.editForm);

// PUT /members/:id — Update member
router.put('/:id', membersController.update);
router.post('/:id/update', membersController.update);

// DELETE /members/:id — Delete member
router.delete('/:id', membersController.delete);
router.post('/:id/delete', membersController.delete);

module.exports = router;
