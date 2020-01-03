/**
 * Calculates a best fit line for a set of x/y points
 * @param {[]} data data set
 * { quantities: [ { x: <x value>, y: <y value> } ] }
 */
module.exports = (pointData) => {
	if (pointData.length < 2) return {};

	// initial empty object
	let bestFitProps = {
		yintercept: undefined,
		slope: undefined
	};

	// calculate the x value mean
	let xquantities = pointData.map(value => value.x );
	let xtotal = xquantities.reduce((a, b) => a + b, 0);
	let xmean = xtotal / pointData.length;

	// calculate the y value mean
	let yquantities = pointData.map(value => value.y );
	let ytotal = yquantities.reduce((a, b) => a + b, 0);
	let ymean = ytotal / pointData.length;

	// calculate slope
	let mtop = 0;
	let mbottom = 0;
	pointData.forEach(value => {
		let xminusxbar = value.x - xmean;
		let yminusybar = value.y - ymean;

		let topChange = xminusxbar * yminusybar;
		let bottomChange = xminusxbar * xminusxbar;

		mtop = mtop + topChange;
		mbottom = mbottom + bottomChange;
	});
	let slope = mtop / mbottom;

	// calculate y intercept
	let yintercept = ymean - ( slope * xmean );

	// set the data to return
	bestFitProps.slope = slope;
	bestFitProps.yintercept = yintercept;

	// return
	return bestFitProps;
};
