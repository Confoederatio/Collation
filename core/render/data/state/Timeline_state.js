if (!global.naissance) global.naissance = {};

//Initialise functions
{
	DALS.Timeline.loadState = async function (arg0_json) {};
	
	/**
	 * Parses a user action inside Naissance. All user actions must be mapped to a valid JSON schema.
	 * 
	 * @param {string} [arg0_key] - The key to push to the current DALS timeline.
	 * @param {Object|string} [arg1_json]
	 *  @param {string} [arg1_json.type="global"] - The scope type to parse the action for. Either 'global'/'feature'/'geometry'/'stencil'.
	 * @param {boolean} [arg2_do_not_push_action=false]
	 */
	DALS.Timeline.parseAction = async function (arg0_key, arg1_json, arg2_do_not_push_action) {
		//Convert from parameters
		let json = (typeof arg1_json === "string") ?
			JSON.parse(arg1_json) : arg1_json;
		
		//Initialise JSON
		if (json.options === undefined) json.options = {};
		if (json.value === undefined) json.value = [];
		
		//Iterate over multi-value packet (MVP) and filter it down to superclass single-value packets (SVPs)
		for (let i = 0; i < json.value.length; i++) {
			let local_value = json.value[i];
			
			if (local_value.type === "global") {
				if (local_value.refresh_date) await naissance.Renderer.setDate(main.date);
				if (local_value.set_date) await naissance.Renderer.setDate(local_value.set_date);
			} else if (local_value.type === "feature") {
				await proc.feature(json.feature_id, json);
			} else if (local_value.type === "geometry") {
				await proc.geometry(json.geometry_id, json);
			} else if (local_value.type === "stencil") {
				console.warn(`[WIP] - Stencils are not yet implemented.`);
			}
		}
		
		//Save action to current timeline if needed
		
	};
	
	DALS.Timeline.saveState = async function () {};
	
	naissance.loadFile = async function (arg0_file_path) {
		//Convert from parameters
		let file_path = path.resolve(arg0_file_path);
		
		//Declare local instance variables
		await db.load(file_path);
	};
	
	naissance.saveFile = async function (arg0_file_path) {
		
	};
}