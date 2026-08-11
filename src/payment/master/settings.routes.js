const express = require('express');
const router = express.Router();
const controller = require('./master.controller');

// User Settings
router.get('/', controller.getUsers);
router.post('/', controller.createUser);
router.put('/:username', controller.updateUser);
router.delete('/:username', controller.deleteUser);

module.exports = router;
