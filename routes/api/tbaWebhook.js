const mongoose = require('mongoose');
const router = require('express').Router();

router.get('/', (req, res) => {
	console.log('Webhook GET: ', { headers: req.headers, body: req.body });
	return res.send(200);
});

router.post('/', (req, res) => {
	console.log('Webhook POST: ', { headers: req.headers, body: req.body });
	if (!req.header('X-TBA-HMAC') || !process.env.TBA_HMAC) return res.send(200);
	if (req.header('X-TBA-HMAC') !== process.env.TBA_HMAC) return res.send(401);

	console.log('Hook authorized!');
});

module.exports = router;