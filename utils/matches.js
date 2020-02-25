const https = require('https');

const mongoose = require('mongoose');
const matches = mongoose.model('matches');

/**
 * Fetch and save all matches for an event from TBA
 * @param {string} eventKey The event key to fetch matches for
 */
module.exports.getMatches = (eventKey) => new Promise((resolve, reject) => {
	if (!process.env.TBA_KEY) {
		console.error('No TBA Key found!');
		process.exit(1);
	}

	let url = 'https://www.thebluealliance.com/api/v3/event/' + eventKey + '/matches/simple';

	https.get(url, { headers: { 'X-TBA-Auth-Key': process.env.TBA_KEY } }, res => {
		let body = '';

		res.setEncoding('utf8');
		res.on('data', data => {
			body += data;
		});
		res.on('end', () => {
			try {
				body = JSON.parse(body);
			} catch (e) {
				console.error('Error parsing matches for event ' + eventKey, e);
				reject(e);
			}
			
			body.forEach(match => {
				matches.findOne({ key: match.key }, (err, doc) => {
					if (err) {
						reject(err);
						console.error('Error finding match ', match.key, err);
					} else {
						if (!doc) doc = new matches({});
						doc.setMatch(match);
						doc.save().then(() => {
							resolve();
						}, e => {
							console.error('Error saving match: ', match.key, e);
							reject(e);
						});
					}
				});
			});
		});
	});
});

/**
 * Fetch and save a specific match by key from TBA
 * @param {string} matchKey The match key to fetch
 */
module.exports.getMatch = (matchKey) => new Promise((resolve, reject) => {
	if (!process.env.TBA_KEY) {
		console.error('No TBA Key found!');
		process.exit(1);
	}

	let url = 'https://www.thebluealliance.com/api/v3/matches/' + matchKey + '/simple';

	https.get(url, { headers: { 'X-TBA-Auth-Key': process.env.TBA_KEY } }, res => {
		let body = '';

		res.setEncoding('utf8');
		res.on('data', data => {
			body += data;
		});
		res.on('end', () => {
			try {
				body = JSON.parse(body);
			} catch (e) {
				console.error('Error parsing matche ' + matchKey, e);
				reject(e);
			}

			matches.findOne({ key: body.key }, (err, doc) => {
				if (err) {
					reject(err);
					console.error('Error finding match ', body.key, err);
				} else {
					if (!doc) doc = new matches({});
					doc.setMatch(body);
					doc.save().then(() => {
						resolve();
					}, e => {
						console.error('Error saving match: ', body.key, e);
						reject(e);
					});
				}
			});
		});
	});
});