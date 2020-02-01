const mongoose = require('mongoose');

const { Schema } = mongoose;

const PitSchema = new Schema({
	event: { type: String, required: true, index: true, default: 'N/A' },
	team: { type: Number, required: true, index: true },
	data: { type: mongoose.Mixed, required: true, default: {} },
	updated: { type: Date, required: true }
});

PitSchema.methods.setUpdated = function() {
	this.updated = Date.now();
};

module.exports = PitSchema;

// load schema into mongoose
mongoose.model('pits', PitSchema, 'pits');