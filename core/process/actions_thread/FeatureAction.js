if (!global.proc) global.proc = {};

/**
 * @param {Object} arg0_json
 *  @param {Object} [arg0_json.feature_obj]
 *  
 *  @param {boolean} [arg0_json.collapse_feature=false]
 */
proc.FeatureAction = async function (arg0_json) {
	//Convert from parameters
	let json = (arg0_json) ? arg0_json : {};
	
	//Declare local instance variables
	let feature_obj = json.feature_obj;
	let value = (typeof feature_obj.value === "string") ? 
		JSON.parse(feature_obj.value) : feature_obj.value;
	
	//Parse actions
	if (json.collapse_feature === false) {
		delete value.is_collapsed;
	} else {
		value.is_collapsed = true;
	}
	
	//Save Feature after parsing
	feature_obj.value = value;
	await db.setValue(feature_obj.id, feature_obj);
};