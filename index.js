const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const createAdmin = require('./utils/admin');

// Configure mongoose's promise to global promise
mongoose.promise = global.Promise;

// setup express
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//Configure Mongoose
mongoose.connect(process.env.DBURL + '/' + process.env.DBNAME, {
	useNewUrlParser: true,
	useFindAndModify: false,
	useCreateIndex: true,
	useUnifiedTopology: true,
});
mongoose.set('debug', Boolean(process.env.MONGOOSEDEBUG)); 

// begin db connection
console.log('connecting to database `' + process.env.DBNAME + '` at ' + process.env.DBURL);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
	console.log('connected!');
	// load users model
	require('./models/UserModel');
	require('./models/InviteCodeModel');
	// load passport
	require('./utils/passport');

	createAdmin(process.env.ADMINEMAIL, process.env.ADMINPASSWORD).then(() => {
		console.log('admin account created');
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
	//app.use('/', express.static(config.staticPath))

	// listen
	app.listen(process.env.PORT, () => {
		console.log(`listening on :${process.env.PORT}...`);
	});
});
