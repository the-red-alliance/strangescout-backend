const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
	res.send('strangescout api is running.');
});

router.use('/users', require('./users'));
router.use('/codes', require('./codes'));
router.use('/runs', require('./runs'));

module.exports = router;