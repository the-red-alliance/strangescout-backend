const mongoose = require('mongoose');
const router = require('express').Router();
const auth = require('../../middlewares/auth');
const runs = mongoose.model('runs');
const processTeam = require('../../utils/processTeam');

// /codes ---------------------------------------------------------------------

//POST code route
router.post('/', auth.required, (req, res) => {
	// load user var after being decoded by auth
	const user = req.payload;
	// load doc from body
	let newRun = { ...req.body };
	// set scouter from authenticated user
	newRun.scouter = user.email;

	if (!newRun.team) return res.status(422).send('`team` is required');
	if (!newRun.match) return res.status(422).send('`match` is required');
	if (!newRun.journal) return res.status(422).send('`journal` is required');

	if (typeof newRun.team !== 'number') return res.status(422).send('`team` must be a number');
	if (typeof newRun.match !== 'number') return res.status(422).send('`match` must be a number');
	if (!Array.isArray(newRun.journal)) return res.status(422).send('`journal` must be an array');

	runs.findOne({ event: newRun.event, team: newRun.team, match: newRun.match }, (e, existingRun) => {
		if (e) return res.status(500).send(e);

		const finalRun = new runs(newRun);
		if (existingRun) finalRun.ignore = true;
		finalRun.setUpdated();
		
		finalRun.save(null, (err, doc) => {
			if (err) return res.status(500).send(err);

			processTeam.updateTeam(doc.event, doc.team);

			return res.status(202).send();
		});
	});
});

router.get('/', auth.required, (req, res) => {
	let updatedDate;
	const updated = req.query.updated;
	if (updated) updatedDate = new Date(JSON.parse(updated));

	const callback = (err, docs) => {
		if (err) return res.status(500).send(err);

		if (Array.isArray(docs)) return res.status(200).json(docs);

		let result = [];
		if (typeof docs === 'object' && docs !== null) result.push(docs);
		return res.status(200).json(result);
	};

	if (updatedDate) {
		return runs.find({ updated: { $gt: updatedDate } }, callback);
	} else {
		return runs.find(callback);
	}
});

// ----------------------------------------------------------------------------

router.get('/ids', auth.required, (req, res) => {
	runs.find((err, docs) => {
		if (err) return res.status(500).send(err);

		let ids = docs.map(item => item._id);
		return res.status(200).json(ids);
	});
});

module.exports = router;