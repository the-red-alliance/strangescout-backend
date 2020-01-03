const mongoose = require('mongoose');
const runs = mongoose.model('runs');
const templates = mongoose.model('templates');
const processedTeams = mongoose.model('processedTeams');

const bestFit = require('./bestFit');

/**
 * Processes all runs for a specific team according to the active game template's processing model
 * @param {number} team team to process run data
 */
module.exports.updateTeam = (team) => {
	// use promises for async
	return new Promise((resolve, reject) => {
		// set start time for logging
		const startTime = Date.now();
		// attempt to locate a template
		templates.findOne({ active: true }, (templateError, templateDoc) => {
			// fail if there was an error finding the template
			if (templateError) {
				// reject the promise with the error and log to console
				reject(templateError);
				return console.error('failed to get template: ', templateError);
			}
			// fail if we couldn't locate an active template
			if (!templateDoc) {
				reject('no active template found');
				return console.error('no active template found');
			}

			// find all runs for the specified team
			runs.find({team: team}, null, {sort: {match: 1}}, (runsError, runDocs) => {
				// fail if there was an error finding runs for the team
				if (runsError) {
					reject(runsError);
					return console.error('failed to get team ' + team + '\'s runs: ', runsError);
				}
				// fail if we succeed but there are no stored runs
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
				// (forEach runs synchronously)
				templateDoc.process.run.forEach((processingObject) => {
					// if the processing type is `average_children`
					// we're going to take the average count per match for each child of the specified top level event
					if (processingObject.type === 'average_children') {
						// attempt to locate the top level event in the template
						// filter the run events array by matching event key
						let matchingTopEvents = templateDoc.scout.run.filter(event => (event.key === processingObject.event));

						// if there's only one top level event with a matching key proceed
						if (matchingTopEvents.length === 1) {
							// for each child of the top level event
							matchingTopEvents[0].children.forEach((child) => {
								// filter the journal down to only the current child event
								let filteredJournal = totalJournal.filter(journalEvent => (journalEvent.event === child.key));

								// if the journal isn't empty
								// (meaning the child event has occurred)
								if (filteredJournal.length > 0) {
									// initialize the nested objects if they don't exist yet
									// dataObj.<topEventKey>.<childEventKey> = {}
									if (!dataObj[matchingTopEvents[0].key]) dataObj[matchingTopEvents[0].key] = {};
									if (!dataObj[matchingTopEvents[0].key][child.key]) dataObj[matchingTopEvents[0].key][child.key] = {};
									// set to the average occurrences per match
									// dataObj.<topEventKey>.<childEventKey>.average = #
									dataObj[matchingTopEvents[0].key][child.key].average = filteredJournal.length / runDocs.length;

									let xypoints = [];
									runDocs.forEach((value, index) => {
										let count = value.journal.filter(journalEvent => (journalEvent.event === child.key)).length;
										xypoints.push({x: index + 1, y: count});
									});
									dataObj[matchingTopEvents[0].key][child.key].average_bestfit = bestFit(xypoints);
								}
							});
						// if there is more than one top level event with the key ignore the processing object
						} else if (matchingTopEvents.length > 1) {
							console.warn('more than one top event found with event key ' + processingObject.key + '!\nIgnoring processing object...');
						// else if we don't find any matching top events ignore
						} else {
							console.warn('no matching top events found with event key ' + processingObject.key + '!\nIgnoring processing object...');
						}

					// if the processing type is `average_duration_children`
					// we're going to take the average duration per occurrence for each child of the specified top level event
					} else if (processingObject.type === 'average_duration_children') {
						let matchingTopEvents = templateDoc.scout.run.filter(event => (event.key === processingObject.event));

						// if there's only one top level event with a matching key proceed
						if (matchingTopEvents.length === 1) {
							// filter down the total journal to the current top and child events
							// ensures we don't get tripped up by "misplaced" events, say, if the item was held
							const childrenKeys = matchingTopEvents[0].children.map(value => value.key);
							const filteredTotalJournal = totalJournal.filter(journalItem => (childrenKeys.includes(journalItem.event)) || (journalItem.event === matchingTopEvents[0].key));

							// for each child of the top level event
							matchingTopEvents[0].children.forEach((child) => {
								// empty indexes array for tracking
								let indexes = [];

								// for each journal event
								filteredTotalJournal.forEach((value, index) => {
									// if the journal event matches the current child we're tracking
									if (value.event === child.key) {
										// push it's index to our indexes array
										indexes.push(index);
									}
								});

								// initialize total time counter
								let totalTime = 0;

								// for each tracked index (each occurrence)
								indexes.forEach(indexValue => {
									// the difference in timestamp between our tracked child and the event before it (the start/get event)
									// is added to the total time counter
									totalTime = totalTime + ( filteredTotalJournal[indexValue].time - filteredTotalJournal[indexValue-1].time );
								});

								// if the journal isn't empty
								// (meaning the child event has occurred)
								if (indexes.length > 0) {
									// initialize the nested objects if they don't exist yet
									// dataObj.<topEventKey>.<childEventKey> = {}
									if (!dataObj[matchingTopEvents[0].key]) dataObj[matchingTopEvents[0].key] = {};
									if (!dataObj[matchingTopEvents[0].key][child.key]) dataObj[matchingTopEvents[0].key][child.key] = {};
									// set to the average duration per occurrence
									// indexes array essentially tracks the number of occurrences, so we can use it for math
									// dataObj.<topEventKey>.<childEventKey>.average_duration = #
									dataObj[matchingTopEvents[0].key][child.key].average_duration = totalTime / indexes.length;

									let xypoints = [];
									runDocs.forEach((value, index) => {
										// empty indexes array for tracking
										let runIndexes = [];

										// for each journal event
										value.journal.forEach((value, journalIndex) => {
											// if the journal event matches the current child we're tracking
											if (value.event === child.key) {
												// push it's index to our indexes array
												runIndexes.push(journalIndex);
											}
										});
									
										// initialize total time counter
										let runTotalTime = 0;
									
										// for each tracked index (each occurrence)
										runIndexes.forEach(indexValue => {
											// the difference in timestamp between our tracked child and the event before it (the start/get event)
											// is added to the total time counter
											runTotalTime = runTotalTime + ( value.journal[indexValue].time - value.journal[indexValue-1].time );
										});
										xypoints.push({x: index + 1, y: runTotalTime / runIndexes.length});
									});
									dataObj[matchingTopEvents[0].key][child.key].average_duration_bestfit = bestFit(xypoints);
								}
							});
						// if there is more than one top level event with the key ignore the processing object
						} else if (matchingTopEvents.length > 1) {
							console.warn('more than one top event found with event key ' + processingObject.key + '!\nIgnoring processing object...');
						// else if we don't find any matching top events ignore
						} else {
							console.warn('no matching top events found with event key ' + processingObject.key + '!\nIgnoring processing object...');
						}

					// else ignore the invalid processing type
					} else {
						console.warn(processingObject.type + ' isn\'t a valid processing type!');
					}
				});

				// after processing is complete, attempt to find a preexisting processed doc for the team
				processedTeams.findOne({ team: team }, (processedDocError, processedDoc) => {
					// fail on an error
					if (processedDocError) {
						reject(processedDocError);
						return console.error('failed to get team ' + team + '\'s processed data doc: ', processedDocError);
					}

					// new doc body
					// sets team, match count, and the new data object
					let newDoc = new processedTeams({ team: team, matches: runDocs.length, data: dataObj });

					// if a processing doc exists already
					if (processedDoc) {
						// overwrite the old doc with our new doc
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
						// use our new doc
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

/**
 * Runs processing on all teams with stored runs
 */
module.exports.updateAllTeams = () => {
	// get a list of each unique value of the team field in the runs table
	runs.distinct('team', (err, teams) => {
		if (err) return console.error('error getting all unique teams: ', err);

		// set start time for logging
		let startTime = Date.now();
		let successes = 0;
		let fails = 0;
		
		// for each unique team
		teams.forEach(teamNumber => {
			// trigger updateTeam on the specific team
			this.updateTeam(teamNumber).then(() => {
				// after completion increment the success counter
				successes = successes + 1;
				// if all teams have been triggered and completed
				if (successes + fails === teams.length) {
					// logs
					console.log('Processed ' + successes + (successes === 1 ? ' team in ' : ' teams in ') + (Date.now() - startTime) + 'ms');
					if (fails > 0) console.warn(fails + (fails === 1 ? ' team ' : ' teams ') + 'failed to process');
				}
			}, e => {
				// on an error increment the fail counter
				fails = fails + 1;
				// log the error
				console.error('error updating team ' + teamNumber + ': ', e);
				// if all teams have been triggered and completed
				if (successes + fails === teams.length) {
					// logs
					console.log('Processed ' + successes + (successes === 1 ? ' team in ' : ' teams in ') + (Date.now() - startTime) + 'ms');
					if (fails > 0) console.warn(fails + (fails === 1 ? ' team ' : ' teams ') + 'failed to process');
				}
			});
		});
	});
};