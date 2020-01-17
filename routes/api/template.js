const fs = require('fs');
const router = require('express').Router();
const auth = require('../../middlewares/auth');

// /template ---------------------------------------------------------------------

// get template
router.get('/', auth.required, (req, res) => res.status(200).json(require('../../utils/template')));

// ---------------------------------------------------------------------

module.exports = router;