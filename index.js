const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const createAdmin = require('./utils/admin');

const template = require('./utils/template');

const loadModels = () => {
	require('./models/UserModel');
	require('./models/InviteCodeModel');
	
	require('./models/EventModel');
	require('./models/MatchModel');
	
	require('./models/RunModel');
	require('./models/ProcessedTeamModel');
	require('./models/TeamModel');
};

// run key checks before start
require('./utils/keyChecks')();

// Configure mongoose's promise to global promise
mongoose.promise = global.Promise;

// setup express
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//Configure Mongoose
mongoose.connect(process.env.DBURL, {
	useNewUrlParser: true,
	useFindAndModify: false,
	useCreateIndex: true,
	useUnifiedTopology: true,
});

// enable debug if the flag is set
mongoose.set('debug', Boolean(process.env.MONGOOSEDEBUG)); 

// begin db connection
console.log('connecting to database `' + process.env.DBURL + '`');
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
	console.log('connected!');

	// load passport
	require('./utils/passport');
	// load models
	loadModels();

	// attempt to create or update the configured default admin account
	createAdmin(process.env.ADMINEMAIL, process.env.ADMINPASSWORD).then(() => {
		console.log('admin done!');
	}, (err) => {
		if (typeof err === 'string') {
			console.log(err);
		} else {
			console.error('error creating default admin:');
			console.error(err);
		}
	});

	// load routes
	app.use(require('./routes'));

	// route / to static frontend files
	app.use('/', express.static(process.env.STATIC))

	// listen on the specified port
	app.listen(process.env.PORT, () => {
		console.log(`listening on :${process.env.PORT}...`);
	});
	
	// update all teams processing on launch
	require('./utils/processTeam').updateAllTeams();
	// fetch all events specified in the template
	require('./utils/events').getEvents();
	// fetch matches for all events specified
	template.events.forEach(eventKey => {
		require('./utils/matches').getMatches(eventKey);
	});
});
