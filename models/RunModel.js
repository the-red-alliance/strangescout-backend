const mongoose = require('mongoose');

const { Schema } = mongoose;

const JournalEntrySchema = new Schema({
	event: { type: String, required: true },
	time: { type: Number, required: true },
	data: { type: Schema.Types.Mixed },
});

const RunSchema = new Schema({
	event: { type: String, required: true, index: true, default: 'N/A' },
	team: { type: Number, required: true, index: true },
	match: { type: Number, required: true, index: true },
	journal: { type: [JournalEntrySchema], required: true },
	notes: { type: String },
	scouter: { type: String, index: true },
	ignore: { type: Boolean, index: true, default: false },
	updated: { type: Date, required: true }
});

RunSchema.methods.setUpdated = function() {
	this.updated = Date.now();
};

module.exports = RunSchema;

// load schema into mongoose
mongoose.model('runs', RunSchema, 'runs');