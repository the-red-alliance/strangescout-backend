const crypto = require('crypto');

module.exports = (secret, data, hmac) => {
	const hash = crypto.createHmac('sha256', secret).update(data).digest('hex');
	return (hash === hmac);
}