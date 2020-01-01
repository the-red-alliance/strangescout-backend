const mongoose = require('mongoose');
const router = require('express').Router();
const auth = require('../../middlewares/auth');
const processedTeams = mongoose.model('processedTeams');

router.get('/', auth.required, (req, res) => {
	// empty updated date var
	let updatedDate;
	// pull the updated param from the request
	const updated = req.params.updated;
	// if an updated param was passed set updatedDate to a Date object parsed from the param
	if (updated) updatedDate = new Date(JSON.parse(updated));

	// define the callback for later
	const callback = (err, docs) => {
		// error if we error
		if (err) return res.status(500).send(err);

		// if docs is an array return it
		if (Array.isArray(docs)) return res.status(200).json(docs);

		// else if docs is an object and not null push the doc into an array and return it
		let result = [];
		if (typeof docs === 'object' && docs !== null) result.push(docs);
		return res.status(200).json(result);
	};

	// if an undated date is given
	if (updatedDate) {
		// return teams docs updated after the given date
		return processedTeams.find({ updated: { $gt: updatedDate } }, callback);
	} else {
		// else return all docs
		return processedTeams.find(callback);
	}
});

// ----------------------------------------------------------------------------

router.get('/ids', auth.required, (req, res) => {
	// find all docs
	processedTeams.find((err, docs) => {
		if (err) return res.status(500).send(err);

		// map all the docs ids to an array and return it
		let ids = docs.map(item => item._id);
		return res.status(200).json(ids);
	});
});

module.exports = router;