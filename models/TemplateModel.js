const mongoose = require('mongoose');

const { Schema } = mongoose;

const GameInfoSchema = new Schema({
	program: { type: String, required: true, uppercase: true },
	name: { type: String, required: true },
	year: { type: Number, required: true },
});

const PositionSchema = new Schema({
	display: { type: String, required: true },
	key: { type: String, required: true },
});

const LoadoutSchema = new Schema({
	display: { type: String, required: true },
	event: { type: String },
});

const ChildEventSchema = new Schema({
	display: { type: String, required: true },
	key: { type: String, required: true },
});

const RunEventSchema = new Schema({
	// can be 'duration' or 'item'
	// 'duration' is a start/stop duration tracker
	// 'item' is a get/place action
	type: { type: String, required: true },
	// button display text
	display: { type: String, required: true },
	// secondary button display text for a duration event
	endDisplay: { type: String },
	// elapsed time for event to become active
	activeTime: { type: Number, required: true, default: 0 },
	// should the event disable at the end of the match
	endDisable: { type: Boolean, required: true, default: true },
	// can the event be held (only matters for 'item' events)
	canHold: { type: Boolean, required: true },
	// can the event still happen if something is being held
	ignoreHold: { type: Boolean, required: true, default: false },
	// event key
	key: { type: String, required: true },
	// secondary key for end of a 'duration' type event
	endKey: { type: String },
	// sub events (only matters for 'item' events)
	children: { type: [ChildEventSchema] },
});

const RunProcessSchema = new Schema({
	type: { type: String, required: true },
	event: { type: String, required: true },
});

const TemplateSchema = new Schema({
	active: { type: Boolean, required: true, default: false },
	gameInfo: { type: GameInfoSchema, required: true },
	positions: { type: [PositionSchema], required: true },
	loadouts: { type: [LoadoutSchema], required: true },
	scout: {
		type: new Schema({
			run: { type: [RunEventSchema], required: true },
		}),
		required: true
	},
	process: {
		type: new Schema({
			run: { type: [RunProcessSchema], required: true },
		}),
		required: true
	}
});

TemplateSchema.methods.setActive = function() {
	let self = this;

	return new Promise((resolve, reject) => {
		mongoose.model('templates').find((err, docs) => {
			if (err) {
				console.error('error finding template doc', err);
				reject(err);
				return;
			}
	
			let counter = 0;
	
			docs.forEach((doc, i, arr) => {
				if (doc._id.toString() === self._id.toString()) {
					doc.active = true;
				} else {
					doc.active = false;
				}
				doc.save(null, e => {
					if (e) {
						reject(e);
						return;
					}
					counter = counter + 1;
					if (counter === arr.length) resolve(self);
				});
			});
		});
	});
};

module.exports = TemplateSchema;

// load schema into mongoose
mongoose.model('templates', TemplateSchema, 'templates');