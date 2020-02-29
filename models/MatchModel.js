const mongoose = require('mongoose');
const { Schema } = mongoose;

const MatchSchema = new Schema({
	event: { type: String, required: true },
	key: { type: String, required: true },
	match: { type: Number, required: true },

	teams: { type: [Number], required: true },

	alliances: { type: mongoose.Mixed, required: true },
	winningAlliance: { type: String },

	time: { type: Date },
	predictedTime: { type: Date },
	actualTime: { type: Date },

	tbaLastModified: { type: Date },
	updated: { type: Date, required: true }
});

MatchSchema.methods.setMatch = function(tbaMatch, lastModified) {
	this.event = tbaMatch.event_key;
	this.key = tbaMatch.key;
	this.match = tbaMatch.match_number;

	this.alliances = {
		red: {
			score: tbaMatch.alliances.red.score,
			teams: tbaMatch.alliances.red.team_keys
		},
		blue: {
			score: tbaMatch.alliances.blue.score,
			teams: tbaMatch.alliances.blue.team_keys
		},
	};
	this.winningAlliance = tbaMatch.winning_alliance;
	
	this.time = new Date(tbaMatch.time);
	this.predictedTime = new Date(tbaMatch.predicted_time);
	this.actualTime = new Date(tbaMatch.actual_time);

	this.teams = [];
	tbaMatch.alliances.red.team_keys.forEach(teamKey => {
		this.teams.push(parseInt(teamKey.substr(3)));
	});
	tbaMatch.alliances.blue.team_keys.forEach(teamKey => {
		this.teams.push(parseInt(teamKey.substr(3)));
	});

	if (lastModified) this.lastModified = lastModified;

	this.updated = Date.now();
};

module.exports = MatchSchema;

// load schema into mongoose
mongoose.model('matches', MatchSchema, 'matches');