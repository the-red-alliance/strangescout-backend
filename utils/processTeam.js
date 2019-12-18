const mongoose = require('mongoose');
const runs = mongoose.model('runs');
const templates = mongoose.model('templates');
const processedTeams = mongoose.model('processedTeams');

/**
 * @param {number} team team to process run data
 */
module.exports.updateTeam = (team) => {
	return new Promise((resolve, reject) => {
		const startTime = Date.now();
		// attempt to locate a template
		templates.findOne({ active: true }, (templateError, templateDoc) => {
			if (templateError) {
				reject(templateError);
				return console.error('failed to get template: ', templateError);
			}
			if (!templateDoc) {
				reject('no active template found');
				return console.error('no active template found');
			}

			// find all runs for the specified team
			runs.find({team: team}, (runsError, runDocs) => {
				if (runsError) {
					reject(runsError);
					return console.error('failed to get team ' + team + '\'s runs: ', runsError);
				}
				if (runDocs.length < 1) {
					reject('no runs found')
					return console.log('found 0 runs for team ' + team + ' - nothing to do...');
				}

				// concat all journals together
				let totalJournal = [];
				runDocs.forEach(runDoc => totalJournal = [ ...totalJournal, ...runDoc.journal ]);

				// initialize processed data object
				let dataObj = {};

				// for each process object
				templateDoc.process.run.forEach((processingObject) => {
					if (processingObject.type === 'average_children') {
						let matchingTopEvents = templateDoc.scout.run.filter(event => (event.key === processingObject.event));

						if (matchingTopEvents.length === 1) {
							matchingTopEvents[0].children.forEach((child) => {
								let filteredJournal = totalJournal.filter(journalEvent => (journalEvent.event === child.key));

								if (filteredJournal.length > 0) {
									if (!dataObj[child.key]) dataObj[child.key] = {};
									dataObj[child.key].average_children = filteredJournal.length / runDocs.length;
								}
							});
						} else {
							console.warn('more than one top event found with event key ' + processingObject.key + '!\nIgnoring processing object...');
						}

					} else if (processingObject.type === 'average_duration_children') {
						let matchingTopEvents = templateDoc.scout.run.filter(event => (event.key === processingObject.event));

						if (matchingTopEvents.length === 1) {
							// filter down the total journal to the current top and child events
							// ensures we don't get tripped up by "misplaced" events, say, if the item was held
							const childrenKeys = matchingTopEvents[0].children.map(value => value.key);
							const filteredTotalJournal = totalJournal.filter(journalItem => (childrenKeys.includes(journalItem.event)) || (journalItem.event === matchingTopEvents[0].key));

							matchingTopEvents[0].children.forEach((child) => {
								let indexes = [];

								filteredTotalJournal.forEach((value, index) => {
									if (value.event === child.key) {
										indexes.push(index);
									}
								});

								let totalTime = 0;

								indexes.forEach(indexValue => {
									totalTime = totalTime + ( filteredTotalJournal[indexValue].time - filteredTotalJournal[indexValue-1].time );
								});

								if (indexes.length > 0) {
									if (!dataObj[child.key]) dataObj[child.key] = {};
									dataObj[child.key].average_duration_children = totalTime / indexes.length;
								}
							});
						} else {
							console.warn('more than one top event found with event key ' + processingObject.key + '!\nIgnoring processing object...');
						}

					} else {
						console.warn(processingObject.type + ' isn\'t a valid processing type!');
					}
				});

				processedTeams.findOne({ team: team }, (processedDocError, processedDoc) => {
					if (processedDocError) {
						reject(processedDocError);
						return console.error('failed to get team ' + team + '\'s processed data doc: ', processedDocError);
					}

					// new doc body
					let newDoc = new processedTeams({ team: team, matches: runDocs.length, data: dataObj });

					if (processedDoc) {
						// update doc if exists
						processedDoc.overwrite(newDoc);
						// set timestamp and save
						processedDoc.setUpdated();
						processedDoc.save(null, (saveError) => {
							if (saveError) {
								reject(saveError);
								return console.error('error saving doc!');
							}
							console.log('Processed ' + runDocs.length + (runDocs.length === 1 ? ' run for team ' : ' runs for team ') + team + ' in ' + (Date.now() - startTime) + 'ms');
							resolve();
						});
					} else {
						// set timestamp and save
						newDoc.setUpdated();
						newDoc.save(null, (saveError) => {
							if (saveError) {
								reject(saveError);
								return console.error('error saving doc!');
							}
							console.log('Processed ' + runDocs.length + (runDocs.length === 1 ? ' run for team ' : ' runs for team ') + team + ' in ' + (Date.now() - startTime) + 'ms');
							resolve();
						});
					}
				});
			});
		});
	});
};

module.exports.updateAllTeams = () => {
	runs.distinct('team', (err, teams) => {
		if (err) return console.error('error getting all unique teams: ', err);

		let startTime = Date.now();
		let counter = 0;

		teams.forEach(teamNumber => {
			this.updateTeam(teamNumber).then(() => {
				counter = counter + 1;
				if (counter === teams.length) {
					console.log('Processed ' + teams.length + (teams.length === 1 ? ' team in ' : ' teams in ') + (Date.now() - startTime) + 'ms');
				}
			}, e => {
				console.error('error updating team ' + teamNumber + ': ', e);
			});
		});
	});
};