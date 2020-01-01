const mongoose = require('mongoose');
const UserSchema = require('../models/UserModel');

// load schema into mongoose
const users = mongoose.model('users', UserSchema, 'users');

const emailValidator = require('email-validator');

module.exports = (email, password) => new Promise((resolve, reject) => {
	// error if a username isn't specified
	if(!email) reject('email required');
	// error if a password isn't specified
	if(!password) reject('password required');
	// error if the email is invalid
	if (!emailValidator.validate(email)) reject('email invalid');

	// attempt to find an existing default admin doc
	console.log('searching for default admin...');
	users.findOne({ defaultAdmin: true }, (err, doc) => {
		// fail on a db error
		if (err) reject(err);

		// setup our new admin doc
		let newUser = {email: email, admin: true, invite: true, defaultAdmin: true};

		// if we found an existing doc
		if (doc) {
			console.log('updating default admin...');
			// overwrite the old doc and save it
			doc.overwrite(newUser);
			doc.setPassword(password);
			return doc.save(null, (err) => {
				if (err) reject(err);
				resolve();
			});
		} else {
			// else create a new doc
			console.log('creating default admin...');
			const finalUser = new users(newUser);
			finalUser.setPassword(password);

			return finalUser.save(null, (err) => {
				if (err) reject(err);
				resolve();
			});
		}
	});
});


