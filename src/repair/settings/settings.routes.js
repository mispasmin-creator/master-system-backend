const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, deleteUser } = require('./settings.controller');

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
