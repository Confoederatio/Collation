if (!global.proc) global.proc = {};

/**
 * Parses a JSON action for a target Geometry.
 * 
 * `arg0_json`: {@link Object}
 * - `.geometry_obj`: {@link naissance.Geometry}
 * 
 * @returns {Promise}
 */
proc.GeometryAction = async function (arg0_json) { //[WIP] - Finish function body
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
			if (json.delete_geometry === true)
				cmd_queue.push({
					function_key: "db.removeValue",
					value: [geometry_obj.id]
				});
			//.move_keyframe
			if (json.move_keyframe)
				keyframes_obj = History.moveKeyframe(
					keyframes_obj, 
					Date.getTimestamp(json.move_keyframe.date), 
					Date.getTimestamp(json.move_keyframe.ot_date)
				);
			//.remove_column
			if (typeof json.remove_variable === "string") {
				Object.iterate(keyframes_obj, (local_key, local_value) => {
					if (local_value?.value?.[2]?.variables)
						delete local_value.value[2].variables[json.remove_variable];
				});
				keyframes_obj = History.cleanKeyframes(keyframes_obj);
			}
			//.remove_keyframe
			if (json.remove_keyframe)
				keyframes_obj = History.removeKeyframe(keyframes_obj, Date.getTimestamp(json.remove_keyframe));
			//.remove_variable
			if (typeof json.remove_variable === "object") {
				let timestamp;
					if (json.remove_variable.date === "end") {
						timestamp = History.getLastKey(keyframes_obj);
					} else if (json.remove_variable.date === "start") {
						timestamp = History.getFirstKey(keyframes_obj);
					}
				
				let keyframe_obj = keyframes_obj[timestamp];
					
				if (keyframe_obj?.value?.[2]?.variables) {
					delete keyframe_obj.value[2].variables[json.remove_variable.key];
					
					if (Object.keys(keyframe_obj.value[2].variables))
						keyframes_obj = History.removeKeyframe(keyframes_obj, timestamp);
					if (
						(keyframe_obj.value[0] === "undefined" || !keyframe_obj.value[0]) &&
						(!keyframe_obj.value[1]) &&
						(Object.keys(keyframe_obj.value[2]).length === 0)
					)
						keyframes_obj = History.removeKeyframe(keyframes_obj, timestamp);
				}
			}
			//.set_description
			if (json.set_description) {
				if (!geometry_obj.metadata) geometry_obj.metadata = {};
				geometry_obj.metadata.description = json.set_description;
			}
			//.set_geometry
			if (json.set_geometry)
				if (json.set_geometry.value) {
					keyframes_obj = History.addKeyframe(
						keyframes_obj, 
						Date.getTimestamp(json.set_geometry.date), 
						json.set_geometry.value
					);
				} else if (json.set_geometry.value === null) {
					keyframes_obj = History.addKeyframe(
						keyframes_obj, 
						Date.getTimestamp(json.set_geometry.date), 
						null
					);
				}
			//.set_history
			if (json.set_history) {
				history_obj = JSON.parse(json.set_history);
				keyframes_obj = (json.set_history.keyframes) ? json.set_history.keyframes : {};
			}
			//.set_label_symbol
			if (json.set_label_symbol) {
				keyframes_obj = History.addKeyframe(keyframes_obj,
					Date.getTimestamp(json.set_label_symbol.date),
					undefined,
					undefined,
					{ label_symbol: json.set_label_symbol.value }
				);
			} else if (json.set_label_symbol === null) {
				keyframes_obj = History.addKeyframe(keyframes_obj,
					Date.getTimestamp(json.set_label_symbol.date),
					undefined,
					undefined,
					{ label_symbol: null }
				);
			}
			//.set_name
			if (json.set_name) {
				let new_name = json.set_name.value;
				if (new_name) new_name = new_name.trim();
				
				keyframes_obj = History.addKeyframe(keyframes_obj, 
					Date.getTimestamp(json.set_name.date), 
					undefined, 
					undefined, 
					{ name: new_name }
				);
			}
			//.set_properties
			if (json.set_properties !== undefined)
				keyframes_obj = History.addKeyframe(keyframes_obj,
					Date.getTimestamp(json.set_properties.date),
					undefined,
					undefined,
					(json.set_properties.value) ? json.set_properties.value : null
				);
			//.set_symbol
			if (json.set_symbol !== undefined)
				keyframes_obj = History.addKeyframe(keyframes_obj,
					Date.getTimestamp(json.set_symbol.date),
					undefined,
					undefined,
					(json.set_symbol.value) ? json.set_symbol.value : null
				);
			//.set_tags
			if (json.set_tags !== undefined) {
				if (!geometry_obj.metadata) geometry_obj.metadata = {};
				geometry_obj.metadata.tags = json.set_tags;
			}
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