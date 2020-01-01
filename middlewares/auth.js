const jwt = require('express-jwt');

// pulls auth token from the request headers
const getTokenFromHeaders = (req) => {
	// use header `authorization`
	const { headers: { authorization } } = req;

	// if the header exists and is prefixed by `Token ` continue
	if(authorization && authorization.split(' ')[0] === 'Token') {
		// return the second part of the header (the actual token)
		return authorization.split(' ')[1];
	} else {
		// else fail
		return null;
	}
};

// define auth methods
// required requires a token to me included, optional doesn't
// if a token is given, the contents of it are passed on in a property named `payload`
const auth = {
	required: jwt({
		secret: process.env.SECRET,
		userProperty: 'payload',
		getToken: getTokenFromHeaders,
	}),
	optional: jwt({
		secret: process.env.SECRET,
		userProperty: 'payload',
		getToken: getTokenFromHeaders,
		credentialsRequired: false,
	}),
};

module.exports = auth;