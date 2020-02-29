const crypto = require('crypto');

module.exports = (secret, data, hmac) => {
	const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(data)).digest('hex');
	console.log('Given HMAC: ' + hmac);
	console.log('Generated HMAC: ' + hash)
	return (hash === hmac);
}