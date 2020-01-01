const mongoose = require('mongoose');

const { Schema } = mongoose;

const InviteCodeSchema = new Schema({
	// code value
	code: { type: String, required: true },
	// will created users be admin
	admin: { type: Boolean, required: true, default: false },
	// will created users be able to invite other users
	invite: { type: Boolean, required: true, default: false },
	// is the token single use
	single: { type: Boolean, required: true, default: false },
	// is there a specific email only available to use the token
	email: { type: String, required: false },
	// does the token expire
	expires: { type: Date, required: false },
});

InviteCodeSchema.methods.generate = function() {
	// use the codes model
	const codes = mongoose.model('codes');
	
	// initialize new code
	let newCode = '';

	// possible characters for code (case-sensitive alphanumeric)
	const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
	// loop
	do {
		// clear new code
		newCode = '';
		// append 8 random characters to the code string
		for (var i = 8; i > 0; --i) newCode += chars[Math.floor(Math.random() * chars.length)];
	} while (
		// while this code does not already exist (unique)
		codes.exists({code: newCode}, (err, res) => {
			// if mongo errors we assume the code is good
			if (err) return false;
			// if the code already exists, generate a new one
			if (res) return true;
			// else the code is good
			return false;
		})
	);
	
	// set the code in the doc
	this.code = newCode;
};

module.exports = InviteCodeSchema;

// load schema into mongoose
mongoose.model('codes', InviteCodeSchema, 'codes');