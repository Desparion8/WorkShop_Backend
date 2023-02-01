const rateLimit = require('express-rate-limit');
const { logEvents } = require('./logger');

const loginLimiter = rateLimit({
	windowMs: 60 * 100, // 1minute
	max: 5, // Limit each IP to 5 login request per `window` per minute
	message: {
		message:
			'Za dużo logowani z danego IP proszę spróbować jeszcze raz za 60 sekund',
	},
	handler: (req, res, next, options) => {
		logEvents(
			`To Many Requests: ${options.message.message}\t${req.method}\t${req.url}\t${req.header.origin}`,
			'errLog.log'
		);
		res.status(options.statusCode).send(options.meassage);
	},
	standardHeaders: true, // return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, //Disable the `X-RateLimit-*` headers
});

module.exports = loginLimiter;
