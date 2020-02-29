const mongoose = require('mongoose');
const runs = mongoose.model('runs');
const processedTeams = mongoose.model('processedTeams');
const template = require('./template');

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
		

		// find all runs for the specified team
		runs.find({team: team}, null, {sort: {match: 1}}, (runsError, runDocs) => {
			// fail if there was an error finding runs for the team
			if (runsError) {
				reject(runsError);
				return console.error('failed to get team ' + team + '\'s runs: ', runsError);
			}
			// fail if we succeed but there are no stored runs
			if (runDocs.length < 1) {
				reject('no runs found');
				return console.log('found 0 runs for team ' + team + ' - nothing to do...');
			}

			// concat all journals together
			let fullJournal = [];
			runDocs.forEach(runDoc => fullJournal = [ ...fullJournal, ...runDoc.journal ]);

			// get distinct events for the team
			const events = [...new Set(runDocs.map(el => el.event))];

			events.forEach((event, i) => {
				// initialize processed data object
				let dataObj = {};

				let totalJournal = [];
				runDocs.filter(runDoc => runDoc.event === event).forEach(runDoc => totalJournal = [ ...totalJournal, ...runDoc.journal ]);

				// for each process object
				// (forEach runs synchronously)
				//templateDoc.process.run.forEach((processingObject) => {
				template.scout.run.forEach((gameElement) => {
					let processTypes = {
						average_children: false,
						single_item_average_children_duration: false,
						multi_item_average_children_duration: false,
						duration_total_duration: false,
					};

					if (gameElement.type === 'single_item') processTypes = {
						...processTypes,
						average_children: true,
						single_item_average_children_duration: true,
					};

					if (gameElement.type === 'multi_item') processTypes = {
						...processTypes,
						average_children: true,
						multi_item_average_children_duration: true,
					};

					if (gameElement.type === 'duration') processTypes = {
						...processTypes,
						duration_total_duration: true,
					};

					// take the average count per match for each child of the specified top level event
					if (processTypes.average_children) {
						// for each child of the top level event
						gameElement.children.forEach((child) => {
							// filter the journal down to only the current child event
							let filteredJournal = totalJournal.filter(journalEvent => (journalEvent.event === child.key));

							// if the journal isn't empty
							// (meaning the child event has occurred)
							if (filteredJournal.length > 0) {
								// initialize the nested objects if they don't exist yet
								// dataObj.<topEventKey>.<childEventKey> = {}
								if (!dataObj[gameElement.key]) dataObj[gameElement.key] = {};
								if (!dataObj[gameElement.key][child.key]) dataObj[gameElement.key][child.key] = {};
								// set to the average occurrences per match
								// dataObj.<topEventKey>.<childEventKey>.average = #
								dataObj[gameElement.key][child.key].average = filteredJournal.length / runDocs.length;

								let xypoints = [];
								runDocs.forEach((value, index) => {
									let count = value.journal.filter(journalEvent => (journalEvent.event === child.key)).length;
									xypoints.push({x: index + 1, y: count});
								});
								dataObj[gameElement.key][child.key].average_bestfit = bestFit(xypoints);
							}
						});
					}

					// take the average duration per occurrence for each child of the specified top level event
					if (processTypes.single_item_average_children_duration) {
						// filter down the total journal to the current top and child events
						// ensures we don't get tripped up by "misplaced" events, say, if the item was held
						const childrenKeys = gameElement.children.map(value => value.key);
						const filteredTotalJournal = totalJournal.filter(journalItem => (childrenKeys.includes(journalItem.event)) || (journalItem.event === gameElement.key));

						// for each child of the top level event
						gameElement.children.forEach((child) => {
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
								if (!dataObj[gameElement.key]) dataObj[gameElement.key] = {};
								if (!dataObj[gameElement.key][child.key]) dataObj[gameElement.key][child.key] = {};
								// set to the average duration per occurrence
								// indexes array essentially tracks the number of occurrences, so we can use it for math
								// dataObj.<topEventKey>.<childEventKey>.average_duration = #
								dataObj[gameElement.key][child.key].average_duration = totalTime / indexes.length;

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
									if (runTotalTime / runIndexes.length) {
										xypoints.push({x: index + 1, y: runTotalTime / runIndexes.length});
									}
								});
								dataObj[gameElement.key][child.key].average_duration_bestfit = bestFit(xypoints);
							}
						});
					}

					if (processTypes.multi_item_average_children_duration) {
						// filter down the total journal to the current top and child events
						// ensures we don't get tripped up by "misplaced" events, say, if the item was held
						const childrenKeys = gameElement.children.map(value => value.key);
						let filteredTotalJournal = totalJournal.filter(journalItem => (childrenKeys.includes(journalItem.event)) || (journalItem.event === gameElement.get.key));

						let counters = {};

						if (filteredTotalJournal.length > 0) {
							gameElement.children.forEach(child => {
								if (!dataObj[gameElement.key]) dataObj[gameElement.key] = {};
								if (!dataObj[gameElement.key][child.key]) dataObj[gameElement.key][child.key] = {};
								counters[child.key] = {
									elapsed: 0,
									total: 0
								};
							});

							while (filteredTotalJournal.length > 0) {
								const getIndex = filteredTotalJournal.findIndex(element => element.event === gameElement.get.key);
								const childIndex = filteredTotalJournal.findIndex(element => childrenKeys.includes(element.event));
							
								if (childIndex !== -1 && getIndex !== -1) {
									const elapsed = filteredTotalJournal[childIndex].time - filteredTotalJournal[getIndex].time;
									counters[filteredTotalJournal[childIndex].event].elapsed += elapsed;
									counters[filteredTotalJournal[childIndex].event].total++;
								}
							
								if (childIndex !== -1) filteredTotalJournal.splice(childIndex, 1);
								if (getIndex !== -1) filteredTotalJournal.splice(getIndex, 1);
							}
						
							Object.keys(counters).forEach(counterKey => {
								if (counters[counterKey].total > 0) dataObj[gameElement.key][counterKey].average_duration = counters[counterKey].elapsed / counters[counterKey].total;
							});
						}
					}

					// take the total duration over an event
					if (processTypes.duration_total_duration) {
						// filter down the total journal to the start and end keys
						// ensures we don't get tripped up by "misplaced" events
						const possibleKeys = [ gameElement.startKey, gameElement.endKey ];
						let filteredTotalJournal = totalJournal.filter(journalItem => (possibleKeys.includes(journalItem.event)));

						// empty indexes array for tracking
						let indexes = [];

						if (filteredTotalJournal.length > 0) {
							if (filteredTotalJournal[filteredTotalJournal.length - 1].event === gameElement.startKey) {
								filteredTotalJournal.push({event: gameElement.endKey, time: template.gameInfo.duration});
							}
						}

						// for each journal event
						filteredTotalJournal.forEach((value, index) => {
							// if the journal event matches the current child we're tracking
							if (value.event === gameElement.endKey) {
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
							if (!dataObj[gameElement.key]) dataObj[gameElement.key] = {};
							// set to the average duration per match
							dataObj[gameElement.key].average_total_duration = totalTime / runDocs.length;
						}
					}
				});

				// after processing is complete, attempt to find a preexisting processed doc for the team
				processedTeams.findOne({ team: team, event: event }, (processedDocError, processedDoc) => {
					// fail on an error
					if (processedDocError) {
						reject(processedDocError);
						return console.error('failed to get team ' + team + '\'s processed data doc: ', processedDocError);
					}

					// new doc body
					// sets team, match count, and the new data object
					let newDoc = new processedTeams({ event: event, team: team, matches: runDocs.length, data: dataObj });

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
							if (i > events.length - 2) {
								console.log('Processed ' + runDocs.length + (runDocs.length === 1 ? ' run at ' : ' runs at ') + events.length + (events.length === 1 ? ' event for team ' : ' events for team ') + team + ' in ' + (Date.now() - startTime) + 'ms');
								resolve();
							}
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
							if (i > events.length - 2) {
								console.log('Processed ' + runDocs.length + (runDocs.length === 1 ? ' run at ' : ' runs at ') + events.length + (events.length === 1 ? ' event for team ' : ' events for team ') + team + ' in ' + (Date.now() - startTime) + 'ms');
								resolve();
							}
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