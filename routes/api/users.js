const mongoose = require('mongoose');
const passport = require('passport');
const router = require('express').Router();
const auth = require('../../middlewares/auth');
const users = mongoose.model('users');
const codes = mongoose.model('codes');

const emailValidator = require('email-validator');

// /users ---------------------------------------------------------------------

//POST new user route (optional, everyone has access)
router.post('/', auth.optional, (req, res) => {
	const user = req.body;

	// error if a username isn't specified
	if(!user.email) return res.status(422).send('email is required');
	// error if a password isn't specified
	if(!user.password) return res.status(422).send('password is required');
	// error if no code is given
	if (!user.code) return res.status(422).send('code is required');
	// error if the email is invalid
	if (!emailValidator.validate(user.email)) return res.status(422).send('invalid email');
	// error if code is not 8 digits or not alphanumeric
	if (!(/^[0-9A-Za-z]{8}$/g.test(user.code))) return res.status(422).send('invalid code');

	// does a code exist?
	codes.findOne({code: user.code}, (err, codeDoc) => {
		if (err) return res.status(500).send(err);

		// does the code exist?
		if (!codeDoc) return res.status(422).send('invalid code');

		// does our email match the code doc?
		if (codeDoc.email && codeDoc.email.toLowerCase() !== user.email.toLowerCase()) return res.status(403).send('code not useable by this account');

		// is the code still valid?
		if (codeDoc.expires && codeDoc.expires < Date.now()) {
			// delete if expired
			codes.findByIdAndDelete(codeDoc._id, (err) => {
				if (err) console.error(err);
			});
			return res.status(440).send('expired code');
		}

		// error if an account already exists under the specified username
		users.exists({ email: user.email.toLowerCase() }, (err, exists) => {
			if (err) return res.status(500).send(err);
			if (exists) return res.status(409).send('Account exists');

			const finalUser = new users({email: user.email.toLowerCase(), admin: codeDoc.admin, invite: codeDoc.invite});
			finalUser.setPassword(user.password);

			return finalUser.save(null, (err, doc) => {
				if (err) return res.status(500).send(err);
				// if this was a single use code, delete it
				if (codeDoc.single) {
					codes.findByIdAndDelete(codeDoc._id, (err) => {
						if (err) console.error(err);
					});
				}
				return res.status(200).json(doc.toAuthJSON());
			});
		});
	});
});

//GET users (required, only authenticated users have access)
router.get('/', auth.required, (req, res) => {
	// load user var after being decoded by auth
	const user = req.payload;
	const { admin } = user;

	// only admins can read this
	if (!admin) return res.status(403).send('not authorized');

	// check users collection for a user by the id in the token
	return users.find((err, docs) => {
		if (err) return res.status(500).send(err);
		if(!docs || docs.length < 1) return res.status(404).send('No users found');
		// return a token for the user
		return res.json(docs);
	});
});


// ----------------------------------------------------------------------------


// /users/session ---------------------------------------------------------------------

//POST session (optional, everyone has access)
router.post('/session', auth.optional, (req, res, next) => {
	const user = req.body;

	// error if a username isn't specified
	if(!user.email) return res.status(422).send('email is required');
	// error if a password isn't specified
	if(!user.password) return res.status(422).send('password is required');
	// error if the email is invalid
	if (!emailValidator.validate(user.email.toLowerCase())) return res.status(422).send('invalid email');

	return passport.authenticate('local', { session: true }, (err, passportUser, info) => {
		if(err) return next(err);

		// handle passport errors
		if (info === 'user not found') return res.status(404).send('User not found');
		if (info === 'invalid') return res.status(401).send('Username or password is invalid');
		
		// if a passport user exists
		if(passportUser) {
			// generate and return a token for the user
			const user = passportUser;
			user.token = passportUser.generateJWT();

			return res.status(200).json(user.toAuthJSON());
		}

		// else return error
		return res.status(500).json({err: err, info: info});
	})(req, res, next);
});

//GET session (required, only authenticated users have access)
router.get('/session', auth.required, (req, res) => {
	// load user var after being decoded by auth
	const user = req.payload;
	const { _id } = user;

	// check users collection for a user by the id in the token
	return users.findById(_id, (err, doc) => {
		if (err) return res.status(500).send(err);
		if(!doc) return res.status(404).send('User not found');
		// return a token for the user
		return res.json(doc.toAuthJSON());
	});
});


// ----------------------------------------------------------------------------


// /users/:id/password ---------------------------------------------------------------------

// PUT new password

router.put('/:id/password', auth.required, (req, res) => {
	// load id to modify
	const id = req.params.id;
	// load user var after being decoded by auth
	const user = req.payload;
	// load request body (new password)
	const { password } = req.body;

	// fail if you're not that user or an admin
	if (id !== user._id && !user.admin) return res.status(403).send('Forbidden');

	// error if an account already exists under the specified username
	users.findById(id, (err, doc) => {
		if (err) return res.status(500).send(err);
		if (!doc) return res.status(404).send('Account not found!');

		if (!password) return res.status(422).send('password required');
		if (typeof password !== 'string') return res.status(422).send('invalid password');

		
		doc.setPassword(password);
		return doc.save().then(() => res.status(202).send('updated'));
	});
});

// ----------------------------------------------------------------------------

module.exports = router;