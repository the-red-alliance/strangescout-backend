const https = require('https');
const template = require('./template');

const mongoose = require('mongoose');
const events = mongoose.model('events');

/**
 * Get an array of team numbers for a specified event
 * @param eventKey A string event key to get teams for
 * @resolves An array of numbers
 */
module.exports.getTeams = (eventKey) => new Promise((resolve, reject) => {
	if (!process.env.TBA_KEY) {
		console.error('No TBA Key found!');
		process.exit(1);
	}

	let url = 'https://www.thebluealliance.com/api/v3/event/' + eventKey + '/teams/simple';

	let req = https.get(url, { headers: { 'X-TBA-Auth-Key': process.env.TBA_KEY } }, res => {
		let body = '';

		res.setEncoding('utf8');
		res.on('data', data => {
			body += data;
		});
		res.on('end', () => {
			try {
				body = JSON.parse(body);
				const teams = body.map(team => team.team_number).sort((a, b) => a - b);
				resolve(teams);
			} catch (e) {
				console.error('ERROR: Error parsing teams ', eventKey, e);
				reject(e);
			}
		});
	});
	req.on('error', e => {
		console.error('error getting teams for event ' + eventKey, e);
	});
	req.on('timeout', e => {
		console.error('error getting teams for event ' + eventKey, e);
		req.abort();
	});
	req.on('uncaughtException', e => {
		console.error('error getting teams for event ' + eventKey, e);
		req.abort();
	});
});

/**
 * Fetch and save an event's info from TBA
 * (Event info + teams)
 * @param eventKey A string event key to fetch and save from TBA
 */
module.exports.getEvent = (eventKey) => new Promise((resolve, reject) => {
	if (!process.env.TBA_KEY) {
		console.error('No TBA Key found!');
		process.exit(1);
	}

	let url = 'https://www.thebluealliance.com/api/v3/event/' + eventKey;
	
	// check if the event exists already
	events.findOne({ key: eventKey }, (err, doc) => {
		// handle an error
		if (err) {
			reject(err);
			console.error('Error finding event ', eventKey, err);
		} else {
			// else if it doesn't exist create a new blank event
			if (!doc) doc = new events({});
			// query TBA for the event
			let req = https.get(url, { headers: { 'X-TBA-Auth-Key': process.env.TBA_KEY } }, res => {
				let body = '';
				// parse the response data
				res.setEncoding('utf8');
				res.on('data', data => {
					body += data;
				});
				// when finished:
				res.on('end', () => {
					body = JSON.parse(body);
					// set the event from the body
					doc.setEvent(body);
					// then get teams for the specified event
					this.getTeams(eventKey).then(teams => {
						// set the teams to the event
						doc.setTeams(teams);
						// save the event doc
						doc.save().then(() => {
							resolve();
						}, e => {
							console.error('Error saving event: ', eventKey, e);
							reject(e);
						});
					}, e => {
						console.error('error getting teams for event ' + eventKey, e);
						reject(e);
					});
					
				});
			});
			req.on('error', e => {
				console.error('error getting event ' + eventKey, e);
			});
			req.on('timeout', e => {
				console.error('error getting event ' + eventKey, e);
				req.abort();
			});
			req.on('uncaughtException', e => {
				console.error('error getting event ' + eventKey, e);
				req.abort();
			});
		}
	});
});

/**
 * Fetch and save all events specified in the template
 * 
 * (No error handling, just triggers the fetch)
 */
module.exports.getEvents = () => {
	template.events.forEach(eventKey => this.getEvent(eventKey));
};
