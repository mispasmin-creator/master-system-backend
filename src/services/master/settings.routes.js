const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, deleteUser } = require('./master.controller');

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:username', updateUser);
router.delete('/:username', deleteUser);

module.exports = router;
