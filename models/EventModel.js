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
	teams: { type: [], required: true, default: [] },
	updated: { type: Date, required: true }
});

/**
 * Sets the document event from a TBA formatted event
 */
EventSchema.methods.setEvent = function(tbaEvent) {
	// not the best way to do this but it works for now
	// need to convert TBA snake case to camel case
	this.city = tbaEvent.city
	this.country = tbaEvent.country
	this.district = tbaEvent.district
	this.endDate = (new Date()).setDate( new Date(DateTime.fromISO(tbaEvent.end_date, {zone: tbaEvent.timezone})).getDate() + 1 )
	this.eventCode = tbaEvent.event_code
	this.key = tbaEvent.key
	this.name = tbaEvent.name
	this.startDate = DateTime.fromISO(tbaEvent.start_date, {zone: tbaEvent.timezone})
	this.year= tbaEvent.year
	this.updated = Date.now();
};
/**
 * Sets an array of team numbers to the event
 */
EventSchema.methods.setTeams = function(teams) {
	this.teams = teams.sort((a,b) => a - b);
	this.updated = Date.now();
};

module.exports = EventSchema;

// load schema into mongoose
mongoose.model('events', EventSchema, 'events');