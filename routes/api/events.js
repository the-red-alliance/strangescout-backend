const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../../middlewares/auth');
const events = mongoose.model('events');

router.get('/', auth.required, (req, res) => {
	events.find((err, docs) => {
		if (err) res.status(500).send(err);
		res.status(200).json(docs);
	});
});

module.exports = router;