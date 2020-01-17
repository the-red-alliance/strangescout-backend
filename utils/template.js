const fs = require('fs');
const YAML = require('yaml');

try {
	let templateString = fs.readFileSync(process.env.TEMPLATE_PATH, 'utf8');
	module.exports = YAML.parse(templateString);
} catch (e) {
	// error handling
	if (e) {
		// return if not found
		if (e.code === 'ENOENT') console.error('ERROR: No template file found at ' + process.env.TEMPLATE_PATH + '!');
		console.error(e);
		process.exit(1);
	}
}