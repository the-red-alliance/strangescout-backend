const mongoose = require('mongoose');
const router = require('express').Router();
const auth = require('../../middlewares/auth');
const codes = mongoose.model('codes');

const emailValidator = require('email-validator');

// /codes ---------------------------------------------------------------------

//POST code route
router.post('/', auth.required, (req, res) => {
	// load user and code vars after being decoded by auth
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

	// if the user isn't able to invite users fail
	if (!user.invite) return res.status(403).send('User does not have permission to invite new users');

	// if an email is given error if the email is invalid
	if (codeReq.email && !emailValidator.validate(codeReq.email)) return res.status(422).send('invalid email');
	// if a duration is given error if the duration isn't a number
	if (codeReq.duration && typeof codeReq.duration !== 'number') return res.status(422).send('invalid duration');

	// set the expiration date
	const expires = new Date();
	// if a duration is passed set the expires data object by hours to the current expires hours plus the passed duration
	if (codeReq.duration) expires.setHours( expires.getHours() + codeReq.duration );

	// create the new code doc
	let newCode = {
		admin: (codeReq.admin && user.admin) ? true : false,
		invite: codeReq.invite ? codeReq.invite : false,
		single: codeReq.single ? codeReq.single : false,
		email: codeReq.email ? codeReq.email.toLowerCase() : undefined,
		expires: codeReq.duration ? expires : undefined
	};
	const finalCode = new codes(newCode);
	// generate the actual code
	finalCode.generate();

	// return the code after saving
	return finalCode.save(null, (err, doc) => {
		if (err) return res.status(500).send(err);

		return res.status(200).json(doc);
	});
});

// ----------------------------------------------------------------------------

module.exports = router;