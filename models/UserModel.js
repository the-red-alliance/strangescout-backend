const mongoose = require('mongoose');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { Schema } = mongoose;

const UserSchema = new Schema({
	// user email
	email: { type: String, required: true },
	// is user admin
	admin: { type: Boolean, required: false, default: false },
	// can user invite others
	invite: { type: Boolean, required: false, default: false },
	// pass hash and salt
	hash: { type: String, required: true },
	salt: { type: String, required: true },
	defaultAdmin: { type: Boolean }
});

UserSchema.methods.setPassword = function(password) {
	this.salt = crypto.randomBytes(16).toString('hex');
	this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

UserSchema.methods.validatePassword = function(password) {
	const hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
	return this.hash === hash;
};

UserSchema.methods.generateJWT = function() {
	return jwt.sign({
		_id: this._id,
		email: this.email,
		admin: this.admin,
		invite: this.invite,
	},
	process.env.SECRET,
	{
		expiresIn: '7 days',
	});
};

UserSchema.methods.toAuthJSON = function() {
	return {
		_id: this._id,
		email: this.email,
		admin: this.admin,
		invite: this.invite,
		token: this.generateJWT(),
	};
};

module.exports = UserSchema;

// load schema into mongoose
mongoose.model('users', UserSchema, 'users');