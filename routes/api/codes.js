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
			"expires": dateobj
		}
	*/

	if (!user.invite) return res.status(403).send('User does not have permission to invite new users');

	// error if the email is invalid
	if (codeReq.email && !emailValidator.validate(codeReq.email)) return res.status(422).send('invalid email');
	if (codeReq.expires && ( !(codeReq.expires instanceof Date) || codeReq.expires < Date.now() )) return res.status(422).send('invalid expiration');

	let newCode = {
		invite: codeReq.invite ? codeReq.invite : false,
		single: codeReq.single ? codeReq.single : false,
		email: codeReq.email ? codeReq.email : undefined,
		expires: codeReq.expires ? codeReq.expires : undefined
	};

	if (codeReq.admin && user.admin) newCode.admin = true;

	const finalCode = new codes(newCode);
	finalCode.generate();

	return finalCode.save(null, (err, doc) => {
		if (err) return res.status(500).send(err);

		return res.status(200).json(doc);
	});
});

// ----------------------------------------------------------------------------

module.exports = router;