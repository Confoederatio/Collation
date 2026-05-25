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
		Object.iterate(object, (local_key, local_value) => {
			if (typeof string_array === "object") {
				string_array.push(`${local_key}: ${JSON.stringify(local_value)}`);
			} else {
				string_array.push(`${local_key}: ${local_value.toString()}`);
			}
		});
		
		//Return statement
		return string_array.join(", ");
	};
}

History.getKeyframe = function (arg0_keyframes, arg1_timestamp) {
	//Convert from parameters
	let keyframes = arg0_keyframes;
	let timestamp = parseInt(arg1_timestamp);
	
	//Declare local instance variables
	let all_keyframes = Object.keys(keyframes)
		.sort((a, b) => parseInt(a) - parseInt(b));
	let return_keyframe = { timestamp: timestamp, value: [] };
	
	//Iterate over all_keyframes in order
	for (let i = 0; i < all_keyframes.length; i++) {
		let local_keyframe = keyframes[all_keyframes[i]];
		
		//Check that the keyframe is still valid
		if (parseInt(all_keyframes[i]) <= return_keyframe.timestamp) {
			if (!local_keyframe.value) continue;
			
			//Iterate over local_keyframe.value and concatenate it
			for (let x = 0; x < local_keyframe.value.length; x++) {
				if (typeof local_keyframe.value[x] === "object" && local_keyframe.value[x] !== null) {
					let old_variables = (return_keyframe.value[x] && return_keyframe.value[x].variables) ?
						return_keyframe.value[x].variables : {};
					
					if (!return_keyframe.value[x]) return_keyframe.value[x] = {};
					
					return_keyframe.value[x] = { ...return_keyframe.value[x], ...local_keyframe.value[x] };
					
					if (local_keyframe.value[x] && local_keyframe.value[x].variables)
						return_keyframe.value[x].variables = { ...old_variables, ...local_keyframe.value[x].variables };
				} else if (local_keyframe.value[x] !== undefined) {
					if (local_keyframe.value[x] === "undefined") continue;
					if (x !== 0 && local_keyframe.value[x] === null) continue;
					return_keyframe.value[x] = local_keyframe.value[x];
				}
			}
		} else { break; }
	}
	
	//Return statement
	return return_keyframe.value;
};

History.getLocalisation = function (arg0_keyframes) {
	//Convert from parameters
	let keyframes = arg0_keyframes;
	
	//Declare local instance variables
	
};