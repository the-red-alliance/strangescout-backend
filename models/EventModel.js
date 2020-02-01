const mongoose = require('mongoose');
const { Schema } = mongoose;
const { DateTime } = require('luxon');

const EventSchema = new Schema({
	name: { type: String, required: true },
	key: { type: String, required: true, unique: true },
	eventCode: { type: String },
	year: { type: Number },
	city: { type: String },
	country: { type: String },
	district: { type: mongoose.Mixed },
	startDate: { type: Date, required: true, index: true },
	endDate: { type: Date, required: true },
	matches: { type: [], required: true, default: [] },
	updated: { type: Date, required: true }
});

EventSchema.methods.setEvent = function(tbaEvent) {
	// not the best way to do this but it works for now
	// need to convert TBA snake case to camel case
	this.city = tbaEvent.city
	this.country = tbaEvent.country
	this.district = tbaEvent.district
	this.endDate = DateTime.fromISO(tbaEvent.end_date, {zone: tbaEvent.timezone})
	this.eventCode = tbaEvent.event_code
	this.key = tbaEvent.key
	this.name = tbaEvent.name
	this.startDate = DateTime.fromISO(tbaEvent.start_date, {zone: tbaEvent.timezone})
	this.year= tbaEvent.year
	this.updated = Date.now();
};

EventSchema.methods.setMatches = function(tbaMatches) {
	let matches = tbaMatches.filter(match => match.comp_level === 'qm').map(match => {
		return {
			eventKey: match.event_key,
			key: match.key,
			match: match.match_number,
			alliances: {
				red: {
					score: match.alliances.red.score,
					teams: match.alliances.red.team_keys
				},
				blue: {
					score: match.alliances.blue.score,
					teams: match.alliances.blue.team_keys
				},
			},
			winningAlliance: match.winning_alliance,
			time: match.time,
			predictedTime: match.predicted_time,
			actualTime: match.actual_time,
		}
	}).sort((a,b) => a.match - b.match);
	this.matches = matches;
	this.updated = Date.now();
};

module.exports = EventSchema;

// load schema into mongoose
mongoose.model('events', EventSchema, 'events');