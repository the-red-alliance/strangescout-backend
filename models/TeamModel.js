const mongoose = require('mongoose');

const { Schema } = mongoose;

const TeamSchema = new Schema({
	event: { type: String, required: true, index: true, default: 'N/A' },
	team: { type: Number, required: true, index: true },
	data: { type: mongoose.Mixed, required: true, default: {} },
	updated: { type: Date, required: true }
});

TeamSchema.methods.setUpdated = function() {
	this.updated = Date.now();
};

module.exports = TeamSchema;

// load schema into mongoose
mongoose.model('teams', TeamSchema, 'teams');