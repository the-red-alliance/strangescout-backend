const mongoose = require('mongoose');
const router = require('express').Router();

router.get('/', (req, res) => {
	console.log('Webhook GET: ', req);
	return res.send(200);
});

router.post('/', (req, res) => {
	console.log('Webhook POST: ', req);
	if (!req.header('X-TBA-HMAC') || !process.env.TBA_HMAC) return res.send(200);
	if (req.header.header('X-TBA-HMAC') !== process.env.TBA_HMAC) return res.send(401);
});