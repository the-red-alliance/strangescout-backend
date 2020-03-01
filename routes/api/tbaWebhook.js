//const mongoose = require('mongoose');
const router = require('express').Router();

const eventsUtils = require('../../utils/events');
const matchesUtils = require('../../utils/matches');

//const verifyHMAC = require('../../utils/verifyHMAC');

router.get('/', (req, res) => {
	console.log('Webhook GET: ', { headers: req.headers, body: req.body });
	return res.send(200);
});

router.post('/', (req, res) => {
	console.log('Webhook POST: ', { headers: req.headers, body: req.body });
	//if (!req.header('X-TBA-HMAC') || !process.env.HOOK_SECRET) return res.sendStatus(200);
	//if (!verifyHMAC(process.env.HOOK_SECRET, req.body, req.header('X-TBA-HMAC'))) return res.sendStatus(401);

	console.log('Hook authorized!');

	switch (req.body.message_type) {
	case 'schedule_updated':
		eventsUtils.getMatches(req.body.message_data.event_key);
		break;
	case 'match_score':
		matchesUtils.getMatch(req.body.message_data.match.key);
		break;
	default:
		break;
	}

	return res.sendStatus(200);
});

module.exports = router;