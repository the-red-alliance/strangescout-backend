module.exports = function() {
	let failed = '';
	//if (!process.env.TBA_KEY) failed = 'TBA_KEY';
	if (!process.env.SECRET) failed = 'SECRET';
	if (!process.env.DBURL) failed = 'DBURL';
	if (!process.env.ADMINEMAIL) failed = 'ADMINEMAIL';
	if (!process.env.ADMINPASSWORD) failed = 'ADMINPASSWORD';


	if (failed !== '') {
		console.error('MISSING KEY: ', failed);
		process.exit(1);
	}
};