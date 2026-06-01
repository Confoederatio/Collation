if (!global.proc) global.proc = {};

/**
 * @param {Object} arg0_json
 *  @param {Object} arg0_json.feature_obj
 *  
 */
proc.FeatureAction = async function (arg0_json) {
	//Convert from parameters
	let json = (arg0_json) ? arg0_json : {};
	
	console.log(`Received JSON:`, json);
	console.log(`Test DB query:`, await db.getValue("35194181118"));
};