const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local');

const users = mongoose.model('users');

// set a new passport strategy
// localStrategy uses a local database
passport.use(new LocalStrategy({
	// use `email` as the username field
	// and `password` as the password field
	usernameField: 'email',
	passwordField: 'password',
}, (email, password, done) => {
	// attempt to find a doc in the users table with the current email
	users.findOne({ email })
		.then((user) => {
			// if we didn't find a matching user, fail
			if(!user) return done(null, false, 'user not found');
			// if we found a user but the passwords don't match fail
			if (!user.validatePassword(password)) return done(null, false, 'invalid');

			return done(null, user);
		}).catch(done);
}));