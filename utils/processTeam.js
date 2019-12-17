const mongoose = require('mongoose');
const runs = mongoose.model('runs');
const templates = mongoose.model('templates');
const processedTeams = mongoose.model('processedTeams');

/**
 * @param {number} team team to process run data
 */
module.exports.updateTeam = (team) => {
	const startTime = Date.now();
	// attempt to locate a template
	templates.findOne({ active: true }, (templateError, templateDoc) => {
		if (templateError) return console.error('failed to get template: ', templateError);
		if (!templateDoc) return console.error('no active template found');

		// find all runs for the specified team
		runs.find({team: team}, (runsError, runDocs) => {
			if (runsError) return console.error('failed to get team ' + team + '\'s runs: ', runsError);
			if (runDocs.length < 1) return console.log('found 0 runs for team ' + team + ' - nothing to do...');

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
						return console.warn('more than one top event found with event key ' + processingObject.key + '!');
					}

				} else if (processingObject.type === 'average_duration_children') {
					let matchingTopEvents = templateDoc.scout.run.filter(event => (event.key === processingObject.event));

					if (matchingTopEvents.length === 1) {
						matchingTopEvents[0].children.forEach((child) => {
							let indexes = [];
							
							totalJournal.forEach((value, index) => {
								if (value.event === child.key) {
									indexes.push(index);
								}
							});

							let totalTime = 0;

							indexes.forEach(indexValue => {
								totalTime = totalTime + ( totalJournal[indexValue].time - totalJournal[indexValue-1].time );
							});
							
							if (indexes.length > 0) {
								if (!dataObj[child.key]) dataObj[child.key] = {};
								dataObj[child.key].average_duration_children = totalTime / indexes.length;
							}
						});
					} else {
						return console.warn('more than one top event found with event key ' + processingObject.key + '!');
					}

				} else {
					console.warn(processingObject.type + ' isn\'t a valid processing type!');
				}
			});

			processedTeams.findOne({ team: team }, (processedDocError, processedDoc) => {
				if (processedDocError) return console.error('failed to get team ' + team + '\'s processed data doc: ', processedDocError);

				// new doc body
				let newDoc = new processedTeams({ team: team, matches: runDocs.length, data: dataObj });

				if (processedDoc) {
					// update doc if exists
					processedDoc.overwrite(newDoc);
					// set timestamp and save
					processedDoc.setUpdated();
					processedDoc.save();
				} else {
					// set timestamp and save
					newDoc.setUpdated();
					newDoc.save();
				}

				console.log('Processed ' + runDocs.length + (runDocs.length === 1 ? ' run for team ' : ' runs for team ') + team + ' in ' + (Date.now() - startTime) + 'ms');
			});
		});
	});
};