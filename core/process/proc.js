if (!global?.proc) global.proc = {};

//Initialise functions
{
	proc.feature = async function (arg0_feature_id, arg1_json) {
		//Convert from parameters
		let feature_id = arg0_feature_id;
		let json = arg1_json;
		
		//Declare local instance variables
		json.feature_obj = await db.getValue(feature_id);
		return await proc.send(json);
	};
	
	proc.geometry = async function (arg0_geometry_id, arg1_json) {
		//Convert from parameters
		let geometry_id = arg0_geometry_id;
		let json = arg1_json;
		
		//Declare local instance variables
		json.geometry_obj = await db.getValue(geometry_id);
		return await proc.send(json);
	};
	
	proc.send = async function (arg0_json) {
		//Convert from parameters
		let json = (arg0_json) ? arg0_json : {};
		
		//Return statement
		return await Blacktraffic.task("process", {
			args: ["IPC_task", json]
		});
	};
}