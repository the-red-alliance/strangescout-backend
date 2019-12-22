const mongoose = require('mongoose');
const router = require('express').Router();
const auth = require('../../middlewares/auth');
const processedTeams = mongoose.model('processedTeams');

router.get('/', auth.required, (req, res) => {
	let updatedDate;
	const updated = req.params.updated;
	if (updated) updatedDate = new Date(JSON.parse(updated));

	const callback = (err, docs) => {
		if (err) return res.status(500).send(err);

		if (Array.isArray(docs)) return res.status(200).json(docs);

		let result = [];
		if (typeof docs === 'object' && docs !== null) result.push(docs);
		return res.status(200).json(result);
	};

	if (updatedDate) {
		return processedTeams.find({ updated: { $gt: updatedDate } }, callback);
	} else {
		return processedTeams.find(callback);
	}
});

// ----------------------------------------------------------------------------

router.get('/ids', auth.required, (req, res) => {
	processedTeams.find((err, docs) => {
		if (err) return res.status(500).send(err);

		let ids = docs.map(item => item._id);
		return res.status(200).json(ids);
	});
});

module.exports = router;