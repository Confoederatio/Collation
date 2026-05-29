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
	let cmd_queue = [];
	let geometry_obj = json.geometry_obj;
	let history_obj = {};
		if (geometry_obj.history) history_obj = JSON.parse(geometry_obj.history);
	let keyframes_obj = (history_obj.keyframes) ? history_obj.keyframes : {};
	
	//Parse commands for geometry_obj by fetching its type, and forwarding commands to there
	if (geometry_obj && geometry_obj.class_name) {
		let handler_function = proc[`${geometry_obj.class_name}Action`];
		
		if (typeof handler_function === "function") {
			let results = await handler_function[`${geometry_obj.class_name}Action`]({
				...json,
				file_path: json.file_path,
				geometry_obj: geometry_obj
			});
			
			if (results.cmd_queue) cmd_queue = cmd_queue.concat(results.cmd_queue);
			if (results.entity_obj) geometry_obj = results.entity_obj;
		}
		
		//Variable handling
		{
			//.add_column
			if (typeof json.add_column === "object") {
				if (!json.add_column.values) {
					let first_key = History.getFirstKey(keyframes_obj);
					json.add_column.values = [[first_key, null]];
				}
				
				//Iterate over all .values[n][0] dates; add keyframes at locations
				for (let i = 0; i < json.add_column.values.length; i++)
					keyframes_obj = History.addKeyframe(history_obj.keyframes,
						json.add_column.values[i][0], 
						undefined, 
						undefined,
						{ variables: { [json.add_column.key]: json.add_column.values[i][1] } }
					);
			}
			//.add_variable
			if (typeof json.add_variable === "object") {
				let timestamp;
					if (json.add_variable.date === "end") {
						timestamp = History.getLastKey(keyframes_obj);
					} else if (json.add_variable.date === "start") {
						timestamp = History.getFirstKey(keyframes_obj);
					} else {
						timestamp = Date.getTimestamp(json.add_variable.date);
					}
				keyframes_obj = History.addKeyframe(keyframes_obj,
					timestamp,
					undefined,
					undefined,
					{ variables: { [json.add_variable.key]: json.add_variable.value } }
				);
			}
			//.clean_keyframes
			if (json.clean_keyframes) {
				let current_brush_symbol = (json.brush_symbol) ? json.brush_symbol : {};
				
				//Symbol cleaning
				if (json.clean_keyframes.includes("symbol")) {
					let first_keyframe = History.getFirstKeyframe(keyframes_obj);
					
					if (first_keyframe) {
						let local_keyframe = JSON.parse(JSON.stringify(first_keyframe));
						let local_symbol = local_keyframe.value[1];
						
						//Iterate over current_brush_symbol and clean duplicates
						Object.iterate(current_brush_symbol, (local_key, local_value) => {
							if (local_symbol && local_symbol[local_key] === local_value)
								delete local_symbol[local_key];
						});
						keyframes_obj = History.replaceKeyframe(keyframes_obj, local_keyframe, { refresh_localisation: false });
					}
				}
				
				keyframes_obj = History.cleanKeyframes(keyframes_obj);
			}
			//.delete_geometry
		}
		
		//Ensure shallow mapping
		history_obj.keyframes = keyframes_obj;
		geometry_obj.history = history_obj;
		
		//Return statement
		return {
			entity_obj: geometry_obj,
			cmd_queue: cmd_queue
		};
	}
};