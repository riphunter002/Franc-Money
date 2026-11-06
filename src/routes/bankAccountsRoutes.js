const { Router } = require('express');
const env = require('../config/env');
const auth = require('../middlewares/auth');
const { createBankAccountsHandler } = require('../services/bankAccounts');

const router = Router();
router.get('/bank-accounts', auth, createBankAccountsHandler(env));

module.exports = router;
