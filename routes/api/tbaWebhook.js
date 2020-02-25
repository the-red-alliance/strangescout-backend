//const mongoose = require('mongoose');
const router = require('express').Router();

const eventsUtils = require('../../utils/events');
const matchesUtils = require('../../utils/matches');

router.get('/', (req, res) => {
	console.log('Webhook GET: ', { headers: req.headers, body: req.body });
	return res.send(200);
});

router.post('/', (req, res) => {
	console.log('Webhook POST: ', { headers: req.headers, body: req.body });
	if (!req.header('X-TBA-HMAC') || !process.env.TBA_HMAC) return res.send(200);
	if (req.header('X-TBA-HMAC') !== process.env.TBA_HMAC) return res.send(401);

	console.log('Hook authorized!');

	switch (req.body.message_type) {
	case 'schedule_updated':
		eventsUtils.getMatches(req.body.message_data.event_key);
		break;
	case 'match_score':
		matchesUtils.getMatch(req.body.message_data.match.match_key);
		break;
	default:
		return;
	}
});

module.exports = router;