const mongoose = require('mongoose');
const router = require('express').Router();
const auth = require('../../middlewares/auth');
const processTeam = require('../../utils/processTeam');
const templates = mongoose.model('templates');

// /template ---------------------------------------------------------------------

// set template
router.post('/', auth.required, (req, res) => {
	// load user var after being decoded by auth
	const user = req.payload;
	if (!user.admin) return res.status(403).send('Forbidden');
	// load doc from body
	let newTemplate = { ...req.body };

	// attempt saving the new template
	const finalTemplate = new templates(newTemplate);
	finalTemplate.save(null, (err, doc) => {
		// if we error when saving
		if (err) {
			// if the error includes `validation failed` we know the doc is invalid and fail accordingly
			if (err._message.includes('validation failed')) return res.status(422).send('invalid doc');
			// else just fail
			return res.status(500).json(err);
		}

		// set the template as active
		finalTemplate.setActive().then((finalDoc) => {
			// trigger a processing on all teams
			processTeam.updateAllTeams();
			return res.status(200).json(finalDoc);
		}, e => {
			// if we error when setting it active fail and delete the doc
			console.error('error setting active template', e);
			templates.deleteOne({ _id: doc._id });
			return res.status(500).send();
		});
	});
});

// get template
router.get('/', auth.required, (req, res) => {
	// find a template marked active
	templates.findOne({ active: true }, (err, doc) => {
		// error if error
		if (err) return res.status(500).send(err);
		// return if not found
		if (!doc) return res.status(404).send('no template found');

		// return doc
		return res.status(200).json(doc);
	});
});

// get specific template
router.get('/:id', auth.required, (req, res) => {
	const id = req.params.id;

	templates.findById(id, (err, doc) => {
		if (err) return res.status(500).send(err);
		if (!doc) return res.status(404).send('no template found');

		return res.status(200).json(doc);
	});
});

// get specific template
router.delete('/:id', auth.required, (req, res) => {
	// load user var after being decoded by auth
	const user = req.payload;
	if (!user.admin) return res.status(403).send('Forbidden');

	const id = req.params.id;

	templates.findByIdAndDelete(id, err => {
		if (err) return res.status(500).send(err);

		return res.status(202).send();
	});
});

// ---------------------------------------------------------------------

module.exports = router;