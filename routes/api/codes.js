const mongoose = require('mongoose');
const router = require('express').Router();
const auth = require('../../middlewares/auth');
const codes = mongoose.model('codes');

const emailValidator = require('email-validator');

// /codes ---------------------------------------------------------------------

//POST code route
router.post('/', auth.required, (req, res) => {
	// load user var after being decoded by auth
	const user = req.payload;

	const codeReq = req.body;

	/*
		{
			"admin": false,
			"invite": false,
			"single": false,
			"email": "email@email.email",
			"duration": 6 // code duration in hours
		}
	*/

	if (!user.invite) return res.status(403).send('User does not have permission to invite new users');

	// error if the email is invalid
	if (codeReq.email && !emailValidator.validate(codeReq.email)) return res.status(422).send('invalid email');
	if (codeReq.duration && typeof codeReq.duration !== 'number') return res.status(422).send('invalid duration');

	const expires = new Date();
	if (codeReq.duration) expires.setHours( expires.getHours() + codeReq.duration );

	let newCode = {
		admin: (codeReq.admin && user.admin) ? true : false,
		invite: codeReq.invite ? codeReq.invite : false,
		single: codeReq.single ? codeReq.single : false,
		email: codeReq.email ? codeReq.email : undefined,
		expires: codeReq.duration ? expires : undefined
	};

	const finalCode = new codes(newCode);
	finalCode.generate();

	return finalCode.save(null, (err, doc) => {
		if (err) return res.status(500).send(err);

		return res.status(200).json(doc);
	});
});

// ----------------------------------------------------------------------------

module.exports = router;