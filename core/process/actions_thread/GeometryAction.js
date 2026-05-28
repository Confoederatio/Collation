if (!global.proc) global.proc = {};

/**
 * Parses a JSON action for a target Geometry.
 * 
 * `arg0_json`: {@link Object}
 * - `.geometry_obj`: {@link naissance.Geometry}
 * 
 * @returns {Promise}
 */
proc.GeometryAction = async function (arg0_json) {
	//Convert from parameters
	let json = (typeof arg0_json === "string") ? JSON.parse(arg0_json) : arg0_json;
	
	//Declare local instance variables
	let geometry_obj = json.geometry_obj;
	let history_obj = {};
		if (geometry_obj.history) history_obj = JSON.parse(geometry_obj.history);
	
	//Parse commands for geometry_obj by fetching its type, and forwarding commands to there
	if (geometry_obj && geometry_obj.class_name) {
		await proc[`${geometry_obj.class_name}Action`]({
			...json,
			file_path: json.file_path,
			geometry_obj: geometry_obj
		});
		
		//Variables handling
		{
			//.add_column
			if (typeof json.add_column === "object") {
				if (!json.add_column.values) {
					let first_key = History.getFirstKey(history_obj.keyframes);
					json.add_column.values = [[first_key, null]];
				}
				
				//Iterate over all .values[n][0] dates; add keyframes at locations
				
			}
		}
	}
};