if (!global?.proc) global.proc = {};

//Initialise util functions
{
	proc.handleCommandQueue = async function (arg0_results_obj) { //[WIP] - Finish function body
		//Convert from parameters
		let results_obj = arg0_results_obj;
		
		//Declare local instance variables
		let results = [];
		
		//Iterate over all elements in results_obj.cmd_queue
		if (results_obj.cmd_queue)
			for (let i = 0; i < results_obj.cmd_queue.length; i++) {
				let local_cmd = results_obj.cmd_queue[i];
				
				//Check for .function_key, .value
				let local_function = Object.getValue(global, local_cmd.function_key);
				local_cmd.value = (local_cmd.value) ? local_cmd.value : [];
				
				if (typeof local_function === "function") 
					results.push(await local_function(...local_cmd.value));
			}
		
		//Return statement
		return results;
	};
}

//Initialise functions
{
	proc.feature = async function (arg0_feature_obj, arg1_json) {
		//Convert from parameters
		let feature_obj = arg0_feature_obj;
		let json = arg1_json;
		
		//Declare local instance variables
		json.feature_obj = (typeof feature_obj === "string") ? 
			await db.getValue(feature_obj) : feature_obj;
		console.log(feature_obj, json.feature_obj);
		json.type = "FeatureAction";
		let result = await proc.send(json);
			if (result.cmd_queue) result.results = await proc.handleCommandQueue(result.cmd_queue);
		
		//Return statement
		return result;
	};
	
	proc.geometry = async function (arg0_geometry_obj, arg1_json) {
		//Convert from parameters
		let geometry_obj = arg0_geometry_obj;
		let json = arg1_json;
		
		//Declare local instance variables
		json.geometry_obj = (typeof geometry_obj === "string") ? 
			await db.getValue(geometry_obj) : geometry_obj;
		json.type = "GeometryAction";
		let result = await proc.send(json);
			if (result.cmd_queue) result.results = await proc.handleCommandQueue(result.cmd_queue);
		
		//Return statement
		return result;
	};
	
	proc.send = async function (arg0_json) {
		//Convert from parameters
		let json = (arg0_json) ? arg0_json : {};
		
		//Return statement
		return await Blacktraffic.task("process", {
			args: [json]
		});
	};
}