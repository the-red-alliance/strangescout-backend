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

	// error if an account already exists under the specified username
	users.exists({ email: email }, (err, exists) => {
		if (err) reject(err);
		if (exists) reject('admin exists');

		const finalUser = new users({email: email, admin: true, invite: true});
		finalUser.setPassword(password);

		return finalUser.save(null, (err) => {
			if (err) reject(err);

			resolve();
		});
	});
});


