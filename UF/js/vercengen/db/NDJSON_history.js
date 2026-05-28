//[VERCENGEN]
if (!global?.History) global.History = {};

//[WIP] - Temporary util functions
{
	String.formatObject = function (arg0_object) {
		//Convert from parameters
		let object = (arg0_object) ? arg0_object : {};
		
		//Internal guard clause if object is empty
		if (Object.keys(object).length === 0) return "None";
		
		//Declare local instance variables
		let string_array = [];
		
		//Iterate over object and parse it to a string
		let all_keys = Object.keys(object);
		
		for (let i = 0; i < all_keys.length; i++) {
			let local_value = object[all_keys[i]];
			
			if (typeof local_value === "object" && local_value !== null) {
				if (Array.isArray(local_value)) {
					string_array.push(`${all_keys[i]}: [${local_value.length}]`);
				} else {
					string_array.push(`${all_keys[i]}: {${Object.keys(local_value).length}}`);
				}
			} else if (local_value !== undefined) {
				string_array.push(`${all_keys[i]}: ${local_value}`);
			}
		}
		
		//Return statement
		return string_array.join(", ");
	};
}

History.addKeyframe = function (arg0_keyframes, arg1_timestamp, ...argn_arguments) {
	//Convert from parameters
	let keyframes_obj = arg0_keyframes;
	let timestamp = arg1_timestamp;
	
	//Declare local instance variables
	let keyframe_obj = keyframes_obj[timestamp];
	
	//Iterate over all argn_arguments and add it to .value, concatenating any objects if they exist
	for (let i = 0; i < argn_arguments.length; i++)
		if (argn_arguments[i] !== undefined)
			if (typeof argn_arguments === "object" && argn_arguments[i] !== null) {
				let old_variables = (keyframe_obj.value[i]?.variables) ? 
					keyframe_obj.value[i].variables : {};
				
				//Handle initial value naively
				keyframe_obj.value[i] = {
					...(keyframe_obj.value[i]) ? keyframe_obj.value[i] : {},
					...argn_arguments[i]
				};
				//Handle shallow nesting for .variables if extant
				if (argn_arguments[i].variables)
					keyframe_obj.value[i].variables = { 
					...old_variables, 
						...argn_arguments[i].variables 
				};
			} else {
				keyframe_obj.value[i] = argn_arguments[i];
			}
	
	//Set new keyframe_obj by mutating keyframes_obj
	keyframes_obj[timestamp] = keyframe_obj;
	
	//Return statement
	return keyframes_obj;
};

History.diffKeyframe = function (arg0_keyframe, arg1_keyframe) {
	//Convert from parameters
	let keyframe = (arg0_keyframe) ? arg0_keyframe : { value: [] };
	let ot_keyframe = (arg1_keyframe) ? arg1_keyframe : {};
	
	//Declare local instance variables
	if (ot_keyframe.value)
		for (let i = 0; i < ot_keyframe.value.length; i++) {
			if (typeof ot_keyframe.value[i] === "object" && ot_keyframe.value[i] !== null) {
				let old_variables = (keyframe.value[i] && keyframe.value[i].variables) ?
					keyframe.value[i].variables : {};
				
				if (!keyframe.value[i]) keyframe.value[i] = {};
				
				keyframe.value[i] = { ...keyframe.value[i], ...ot_keyframe.value[i] };
				
				if (ot_keyframe.value[i] && ot_keyframe.value[i].variables)
					keyframe.value[i].variables = { ...old_variables, ...ot_keyframe.value[i].variables };
			} else if (ot_keyframe.value[i] !== undefined) {
				if (ot_keyframe.value[i] === "undefined") continue;
				if (i !== 0 && ot_keyframe.value[i] === null) continue;
				keyframe.value[i] = ot_keyframe.value[i];
			}
		}
	
	//Return statement
	return keyframe;
};

History.getFirstKeyframe = function (arg0_keyframes) {
	//Convert from parameters
	let keyframes_obj = (arg0_keyframes) ? arg0_keyframes : {};
	
	//Declare local instance variables
	let all_timestamps = History.getTimestamps(keyframes_obj);
	
	//Return statement
	return (all_timestamps.length > 0) ? 
		keyframes_obj[all_timestamps[0]] : null;
};

History.getLastKeyframe = function (arg0_keyframes) {
	//Convert from parameters
	let keyframes_obj = (arg0_keyframes) ? arg0_keyframes : {};
	
	//Declare local instance variables
	let all_timestamps = History.getTimestamps(keyframes_obj);
	
	//Return statement
	return (all_timestamps.length > 0) ? 
		keyframes_obj[all_timestamps[all_timestamps.length - 1]] : null;
};
	
History.getLocalisation = function (arg0_keyframe, arg1_keyframe) {
	//Convert from parameters
	let old_keyframe = (arg0_keyframe) ? arg0_keyframe : {};
	let new_keyframe = (arg1_keyframe) ? arg1_keyframe  : {};
	
	//Declare local instance variables
	let return_string = [];
	
	try {
		//[0] .geometry change
		if (new_keyframe.value[0])
			return_string.push(`Geometry changed`);
		if (new_keyframe.value[0] === null)
			return_string.push(`Geometry removed`);
		
		//[1] .symbol change
		if (new_keyframe.value[1])
			return_string.push(`Symbol changed to: ${String.formatObject(new_keyframe.value[1])}`);
		
		//[2] .properties change
		if (new_keyframe.value[2]?.hidden === false)
			return_string.push(`Geometry visible`);
		if (new_keyframe.value[2]?.hidden === true)
			return_string.push(`Geometry hidden`);
		if (new_keyframe.value[2]?.label_geometries)
			if (new_keyframe.value[2].label_geometries.length > 0)
				return_string.push(`Set custom label geometries`);
		if (new_keyframe.value[2]?.label_name)
			return_string.push(`Label name changed to: ${new_keyframe.value[2].label_name}`);
		if (new_keyframe.value[2]?.label_symbol)
			return_string.push(`Label symbol changed to: ${String.formatObject(new_keyframe.value[2].label_symbol)}`);
		if (new_keyframe.value[2]?.max_zoom !== undefined)
			return_string.push(`Maximum zoom set to ${new_keyframe.value[2].max_zoom}`);
		if (new_keyframe.value[2]?.min_zoom !== undefined)
			return_string.push(`Minimum zoom set to ${new_keyframe.value[2].min_zoom}`);
		if (new_keyframe.value[2]?.name)
			return_string.push(`Name changed to ${new_keyframe.value[2].name}`);
		if (new_keyframe.value[2]?.variables)
			return_string.push(`Variables changed to: ${String.formatObject(new_keyframe.value[2].variables)}`);
	} catch (e) {
		console.error(`History.getLocalisation - new_keyframe:`, new_keyframe, `old_keyframe:`, old_keyframe, `Error:`, e);
	}
	
	return return_string;
};

History.getKeyframe = function (arg0_keyframes, arg1_timestamp) {
	//Convert from parameters
	let keyframes = arg0_keyframes;
	let timestamp = parseInt(arg1_timestamp);
	
	//Declare local instance variables
	let all_keyframes = History.getTimestamps(keyframes);
	let return_keyframe = { timestamp: timestamp, value: [] };
	
	//Iterate over all_keyframes in order
	for (let i = 0; i < all_keyframes.length; i++) {
		let local_keyframe = keyframes[all_keyframes[i]];
		
		//Check that the keyframe is still valid
		if (parseInt(all_keyframes[i]) <= return_keyframe.timestamp) {
			if (!local_keyframe.value) continue;
			
			//Merge keys using diffKeyframe
			return_keyframe = History.diffKeyframe(return_keyframe, local_keyframe);
		} else { break; }
	}
	
	//Return statement
	return return_keyframe.value;
};

History.getKeyframes = function (arg0_keyframes) {
	//Convert from parameters
	let keyframes = arg0_keyframes;
	
	//Declare local instance variables
	let all_keyframes = History.getTimestamps(keyframes);
	let return_keyframe = { value: [] };
	
	//Iterate over all_keyframes in order
	for (let i = 0; i < all_keyframes.length; i++) {
		let local_keyframe = keyframes[all_keyframes[i]];
		
		local_keyframe.localisation = History.getLocalisation(return_keyframe, local_keyframe);
		return_keyframe = History.diffKeyframe(return_keyframe, local_keyframe);
	}
	
	//Return statement
	return keyframes;
};

History.getTimestamps = function (arg0_keyframes) {
	//Convert from parameters
	let keyframes = (arg0_keyframes) ? arg0_keyframes : {};
	
	//Return statement
	return Object.keys(keyframes)
		.sort((a, b) => parseInt(a) - parseInt(b));
};

History.removeKeyframe = function (arg0_keyframes, arg1_timestamp) {
	//Convert from parameters
	let keyframes_obj = arg0_keyframes;
	let timestamp = parseInt(arg1_timestamp);
	
	//Return statement; delete timestamp key
	delete keyframes_obj[timestamp];
	return keyframes_obj;
};