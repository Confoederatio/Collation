if (!global.naissance) global.naissance = {};

naissance.Geometry.parseAction = async function (arg0_json) { //[WIP] - Add variable actions
	//Convert from parameters
	let json = (typeof arg0_json === "string") ? JSON.parse(arg0_json) : arg0_json;
	
	//Declare local instance variables
	let geometry_obj = (typeof json.geometry_obj === "string") ? 
		naissance.Geometry.instances[json.geometry_obj] : json.geometry_obj;
	
	//Parse commands for geometry_obj
	if (geometry_obj) {
		//Specialised Geometry handler
		if (geometry_obj.class_name)
			if (["GeometryLine", "GeometryPoint", "GeometryPolygon"].includes(geometry_obj.class_name))
				await naissance[geometry_obj.class_name].parseAction(json);
	}
};