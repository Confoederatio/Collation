if (!global.proc) global.proc = {};

proc.GeometryAction = async function (arg0_json) {
	//Convert from parameters
	let json = (typeof arg0_json === "string") ? JSON.parse(arg0_json) : arg0_json;
	
	//Declare local instance variables
	let geometry_obj = json.geometry_obj;
		if (json.geometry_obj === undefined)
			geometry_obj = await NDJSON.getValue(json.file_path, json.geometry_id);
	
	//Parse commands for geometry_obj by fetching its type, and forwarding commands to there
	if (geometry_obj && geometry_obj.class_name) {
		
		
		await proc[`${geometry_obj.class_name}Action`]({
			...json,
			file_path: json.file_path,
			geometry_obj: geometry_obj
		});
	}
};