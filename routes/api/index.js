const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
	res.send('strangescout api is running.');
});

router.use('/users', require('./users'));
router.use('/codes', require('./codes'));
router.use('/template', require('./template'));
router.use('/runs', require('./runs'));
router.use('/processedTeams', require('./processedTeams'));
router.use('/webhook', require('./tbaWebhook'));
router.use('/events', require('./events'));
router.use('/teams', require('./teams'));

module.exports = router;