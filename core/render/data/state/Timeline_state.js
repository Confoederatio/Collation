if (!global.naissance) global.naissance = {};

//Initialise functions
{
	DALS.Timeline.loadState = async function (arg0_json) {
		
	};
	
	/**
	 * Parses a user action inside Naissance. All user actions must be mapped to a valid JSON schema.
	 * 
	 * @param {string} [arg0_key] - The key to push to the current DALS timeline.
	 * @param {Object|string} [arg1_json]
	 *  @param {string} [arg1_json.scope="global"] - The scope to parse the action for.
	 */
	DALS.Timeline.parseAction = async function (arg0_key, arg1_json) {
		//Convert from parameters
		let json = (typeof arg1_json === "string") ?
			JSON.parse(arg1_json) : arg1_json;
		
		//Declare local instance variables
		
	};
	
	DALS.Timeline.saveState = async function () {
		
	};
	
	naissance.loadFile = async function (arg0_file_path) {
		
	};
	
	naissance.saveFile = async function (arg0_file_path) {
		
	};
}