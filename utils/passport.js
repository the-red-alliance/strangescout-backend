const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local');

const users = mongoose.model('users');

passport.use(new LocalStrategy({
	usernameField: 'email',
	passwordField: 'password',
}, (email, password, done) => {
	users.findOne({ email })
		.then((user) => {
			if(!user) return done(null, false, 'user not found');
			if (!user.validatePassword(password)) return done(null, false, 'invalid');

			return done(null, user);
		}).catch(done);
}));