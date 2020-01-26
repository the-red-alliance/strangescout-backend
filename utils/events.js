const mongoose = require('mongoose');
const events = mongoose.model('events');
const template = require('./template');
const https = require('https');

module.exports.getEvents = function() {
	if (!process.env.TBA_KEY) {
		console.error('No TBA Key found!');
		process.exit(1);
	}
	
	template.events.forEach(eventKey => {
		let url = 'https://www.thebluealliance.com/api/v3/event/' + eventKey;

		events.findOne({ key: eventKey }, (err, doc) => {
			if (err) {
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
						doc.save();
					});
				});
			}
		});
	});
}
