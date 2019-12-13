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

	console.log('searching for default admin...');
	users.findOne({ defaultAdmin: true }, (err, doc) => {
		if (err) reject(err);

		let newUser = {email: email, admin: true, invite: true, defaultAdmin: true};

		if (doc) {
			console.log('updating default admin...');
			doc.overwrite(newUser);
			doc.setPassword(password);
			return doc.save(null, (err) => {
				if (err) reject(err);
				resolve();
			});
		} else {
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


