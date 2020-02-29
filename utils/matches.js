const https = require('https');

const mongoose = require('mongoose');
const matches = mongoose.model('matches');
const motionworks = mongoose.model('motionworks');

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

	let req = https.get(url, { headers: { 'X-TBA-Auth-Key': process.env.TBA_KEY } }, res => {
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
				if (match.comp_level !== 'qm') return;
				matches.findOne({ key: match.key }, (err, doc) => {
					if (err) {
						reject(err);
						console.error('Error finding match ', match.key, err);
					} else {
						if (!doc) doc = new matches({});
						doc.setMatch(match);
						doc.save().then(() => {
							this.getMatchMotionworks(match.event_key, match.match_number, match.key).then(() => {
								resolve();
							}, e => {
								console.error('error getting motionworks: ', e);
								reject(e);
							});
						}, e => {
							console.error('Error saving match: ', match.key, e);
							reject(e);
						});
					}
				});
			});
		});
	});
	req.on('error', e => {
		console.error('error getting matches for event ' + eventKey, e);
	});
	req.on('timeout', e => {
		console.error('error getting matches for event ' + eventKey, e);
		req.abort();
	});
	req.on('uncaughtException', e => {
		console.error('error getting matches for event ' + eventKey, e);
		req.abort();
	});
});

/**
 * Fetch and save a specific match by key from TBA
 * 
 * Also fetches motionworks data for the match if available
 * @param {string} matchKey The match key to fetch
 */
module.exports.getMatch = (matchKey) => new Promise((resolve, reject) => {
	if (!process.env.TBA_KEY) {
		console.error('No TBA Key found!');
		process.exit(1);
	}

	let url = 'https://www.thebluealliance.com/api/v3/matches/' + matchKey + '/simple';

	let req = https.get(url, { headers: { 'X-TBA-Auth-Key': process.env.TBA_KEY } }, res => {
		let body = '';

		res.setEncoding('utf8');
		res.on('data', data => {
			body += data;
		});
		res.on('end', () => {
			try {
				body = JSON.parse(body);
			} catch (e) {
				console.error('Error parsing match ' + matchKey, e);
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
						this.getMatchMotionworks(body.event_key, body.match_number, matchKey).then(() => {
							resolve();
						}, e => {
							console.error('error getting motionworks: ', e);
							reject(e);
						});
					}, e => {
						console.error('Error saving match: ', body.key, e);
						reject(e);
					});
				}
			});
		});
	});
	req.on('error', e => {
		console.error('error getting match ' + matchKey, e);
	});
	req.on('timeout', e => {
		console.error('error getting match ' + matchKey, e);
		req.abort();
	});
	req.on('uncaughtException', e => {
		console.error('error getting match ' + matchKey, e);
		req.abort();
	});
});

/**
 * Fetch motionworks data for a specified match if available
 * @param {string} matchKey the match key
 */
module.exports.getMatchMotionworks = (event, match, matchKey) => new Promise((resolve, reject) => {
	if (!process.env.TBA_KEY) {
		console.error('No TBA Key found!');
		process.exit(1);
	}

	let url = 'https://www.thebluealliance.com/api/v3/match/' + matchKey + '/zebra_motionworks';

	motionworks.findOne({ key: matchKey }, (err, doc) => {
		if (err) {
			reject(err);
			console.error('Error finding motionworks for match key ', matchKey, err);
		} else {
			let headers = {
				'X-TBA-Auth-Key': process.env.TBA_KEY,
				'If-Modified-Since': (doc && doc.tbaLastModified) ? doc.tbaLastModified.toUTCString() : (new Date(0)).toUTCString()
			};

			let req = https.get(url, { headers: headers }, res => {
				let body = '';
		
				res.setEncoding('utf8');
				res.on('data', data => {
					body += data;
				});
				res.on('end', () => {
					if ((res.statusCode === 304) || (res.statusCode === 404)) {
						resolve();
					} else if (199 < res.statusCode < 300) {
						try {
							body = JSON.parse(body);
						} catch (e) {
							console.error('Error parsing match ' + matchKey, e);
							reject(e);
						}
						let teams = body.alliances.red.map(allianceTeam => parseInt(allianceTeam.team_key.substr(3)));
						teams = teams.concat(body.alliances.blue.map(allianceTeam => parseInt(allianceTeam.team_key.substr(3))));
						let counter = 0;
						let failed = false;

						teams.forEach(team => {
							motionworks.findOne({ team: team, key: matchKey }, (err, motionDoc) => {
								if (err) {
									reject(err);
									console.error('Error finding motionworks doc for team ' + team + ' on match key ', matchKey, err);
								} else {
									if (!motionDoc) motionDoc = new motionworks({});
									motionDoc.key = matchKey;
									motionDoc.team = team;
									motionDoc.event = event;
									motionDoc.match = match;
									motionDoc.tbaLastModified = res.headers['last-modified'] ? res.headers['last-modified'] : new Date();
									motionDoc.setPositions(team, body);
									motionDoc.save().then(() => {
										counter = counter + 1;
										if (counter === teams.length) {
											if (failed) {
												reject();
											} else {
												resolve();
											}
										}
									}, e => {
										console.error('Error saving motionworks: ', body.key, e);
										counter = counter + 1;
										failed = true;
										if (counter === teams.length) {
											reject(e);
										}
									});
								}
							});
						});
					} else {
						console.error('bad request response: ', res.statusCode);
						reject(res);
					}
				});
			});
			req.on('error', e => {
				console.error('error getting motionworks for match ' + matchKey, e);
				this.getMatchMotionworks(event, match, matchKey).then(() => {
					resolve();
				}, e => {
					console.error('error in retriggered motionworks fetch for match ' + matchKey, e);
					reject(e);
				});
			});
			req.on('timeout', e => {
				console.error('error getting motionworks for match ' + matchKey, e);
				req.abort();
				this.getMatchMotionworks(event, match, matchKey).then(() => {
					resolve();
				}, e => {
					console.error('error in retriggered motionworks fetch for match ' + matchKey, e);
					reject(e);
				});
			});
			req.on('uncaughtException', e => {
				console.error('error getting motionworks for match ' + matchKey, e);
				req.abort();
				this.getMatchMotionworks(event, match, matchKey).then(() => {
					resolve();
				}, e => {
					console.error('error in retriggered motionworks fetch for match ' + matchKey, e);
					reject(e);
				});
			});
		}
	});

	
});