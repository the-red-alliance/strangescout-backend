const mongoose = require('mongoose');
const events = mongoose.model('events');
const template = require('./template');
const https = require('https');

module.exports.getEvents = function() {
	if (!process.env.TBA_KEY) {
		console.error('No TBA Key found!');
		process.exit(1);
	}

	return new Promise((resolve, reject) => {
		template.events.forEach(eventKey => {
			let url = 'https://www.thebluealliance.com/api/v3/event/' + eventKey;
	
			events.findOne({ key: eventKey }, (err, doc) => {
				if (err) {
					reject(err);
					console.error('Error finding event ', eventKey, err);
				} else {
					if (!doc) doc = new events({});
	
					https.get(url, { headers: { 'X-TBA-Auth-Key': process.env.TBA_KEY } }, res => {
						let body = '';
	
						res.setEncoding('utf8');
						res.on('data', data => {
							body += data;
						});
						res.on('end', () => {
							body = JSON.parse(body);
							doc.setEvent(body);
							doc.save().then(() => {
								this.getMatches(eventKey).then(() => {
									this.getTeams(eventKey).then(() => {
										resolve();
									}, e => {
										reject(e);
										return console.error(e);
									});
								}, e => {
									reject(e);
									return console.error(e);
								});
							}, (e) => {
								reject(e);
								return console.error('Error saving event: ', eventKey, e);
							});
						});
					});
				}
			});
		});
	});
};

module.exports.getMatches = function(event) {
	return new Promise((resolve, reject) => {
		if (!process.env.TBA_KEY) {
			console.error('No TBA Key found!');
			process.exit(1);
		}
		
		const callback = (eventKey, url) => {
			events.findOne({ key: eventKey }, (err, doc) => {
				if (err) {
					reject(err);
					return console.error('ERROR: Error finding event ', eventKey, err);
				} else {
					if (!doc) {
						reject('ERROR: No event doc stored!: ', eventKey);
						return console.error('ERROR: No event doc stored!: ', eventKey);
					}
	
					https.get(url, { headers: { 'X-TBA-Auth-Key': process.env.TBA_KEY } }, res => {
						let body = '';
	
						res.setEncoding('utf8');
						res.on('data', data => {
							body += data;
						});
						res.on('end', () => {
							body = JSON.parse(body);
							doc.setMatches(body);
							doc.save(e => {
								if (e) {
									reject(e);
									return console.error('ERROR: Error saving event ', eventKey, e);
								}
								resolve();
							});
						});
					});
				}
			});
		};
	
		if (event) {
			let url = 'https://www.thebluealliance.com/api/v3/event/' + event + '/matches/simple';
			callback(event, url);
		} else {
			template.events.forEach(eventKey => {
				let url = 'https://www.thebluealliance.com/api/v3/event/' + eventKey + '/matches/simple';
				callback(eventKey, url);
			});
		}
	});
};

module.exports.getTeams = function(event) {
	return new Promise((resolve, reject) => {
		if (!process.env.TBA_KEY) {
			console.error('No TBA Key found!');
			process.exit(1);
		}
		
		const callback = (eventKey, url) => {
			events.findOne({ key: eventKey }, (err, doc) => {
				if (err) {
					reject(err);
					return console.error('ERROR: Error finding event ', eventKey, err);
				} else {
					if (!doc) {
						reject('ERROR: No event doc stored!: ', eventKey);
						return console.error('ERROR: No event doc stored!: ', eventKey);
					}
	
					https.get(url, { headers: { 'X-TBA-Auth-Key': process.env.TBA_KEY } }, res => {
						let body = '';
	
						res.setEncoding('utf8');
						res.on('data', data => {
							body += data;
						});
						res.on('end', () => {
							body = JSON.parse(body);
							doc.setTeams(body);
							doc.save(e => {
								if (e) {
									reject(e);
									return console.error('ERROR: Error saving event ', eventKey, e);
								}
								resolve();
							});
						});
					});
				}
			});
		};
	
		if (event) {
			let url = 'https://www.thebluealliance.com/api/v3/event/' + event + '/teams/simple';
			callback(event, url);
		} else {
			template.events.forEach(eventKey => {
				let url = 'https://www.thebluealliance.com/api/v3/event/' + eventKey + '/teams/simple';
				callback(eventKey, url);
			});
		}
	});
};