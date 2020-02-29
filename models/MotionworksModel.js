const mongoose = require('mongoose');
const { Schema } = mongoose;

const MotionworksSchema = new Schema({
	key: { type: String, required: true },
	event: { type: String, required: true },
	team: { type: Number, required: true },
	match: { type: Number, required: true },
	positions: { type: [], required: true, default: [] },
	tbaLastModified: { type: Date, required: true },
	updated: { type: Date, required: true }
});

/**
 * Sets the document event from a TBA formatted event
 * @param {number} team team number
 * @param {{}} tbaData TBA formatted match data
 */
MotionworksSchema.methods.setPositions = function(team, tbaData) {
	let positions = [];

	Object.keys(tbaData.alliances).forEach(alliance => {
		tbaData.alliances[alliance].forEach(teamData => {
			if (team === parseInt(teamData.team_key.substring(3))) {
				tbaData.times.forEach((timestamp, i) => {
					let position = {
						time: timestamp,
						x: teamData.xs[i] ? teamData.xs[i] : null,
						y: teamData.ys[i] ? teamData.ys[i] : null
					};

					positions.push(position);
				});
			}
		});
	});

	this.positions = positions;
	this.updated = Date.now();
};

module.exports = MotionworksSchema;

// load schema into mongoose
mongoose.model('motionworks', MotionworksSchema, 'motionworks');