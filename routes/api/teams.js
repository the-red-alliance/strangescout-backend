const mongoose = require('mongoose');
const router = require('express').Router();
const auth = require('../../middlewares/auth');
const teams = mongoose.model('teams');

// /teams ---------------------------------------------------------------------

//put code route
router.put('/:teamNum', auth.required, (req, res) => {
	// load doc from body
	let newTeam = { ...req.body };

	teams.findOne({team: req.params.teamNum, event: newTeam.event}, (err, doc) => {
		const callback = (err, doc) => {
			if (err) return res.status(500).send(err);
			return res.status(200).json(doc);
		}

		if (err) { console.error(err); return res.status(500).send(err); }
		if (!doc) {
			let doc = new teams(newTeam);
			doc.setUpdated();
			doc.save(callback);
		} else {
			doc.overwrite(newTeam);
			doc.setUpdated();
			doc.save(callback);
		}
	});
});

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
		return teams.find({ updated: { $gt: updatedDate } }, callback);
	} else {
		return teams.find(callback);
	}
});

router.get('/ids', auth.required, (req, res) => {
	teams.find((err, docs) => {
		if (err) return res.status(500).send(err);

		let ids = docs.map(item => item._id);
		return res.status(200).json(ids);
	});
});

module.exports = router;