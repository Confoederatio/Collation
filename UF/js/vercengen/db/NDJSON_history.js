//[VERCENGEN]
if (!global?.History) global.History = {};

History.getKeyframe = function (arg0_keyframes, arg1_timestamp) {
	//Convert from parameters
	let keyframes = arg0_keyframes;
	let timestamp = parseInt(arg1_timestamp);
	
	//Declare local instance variables
	let return_keyframe = { timestamp: timestamp, value: [] };
	let all_keyframes = Object.keys(keyframes).sort((a, b) => parseInt(a) - parseInt(b));
	
	for (let i = 0; i < all_keyframes.length; i++) {
		let local_keyframe = keyframes[all_keyframes[i]];
		
		if (parseInt(all_keyframes[i]) <= parseInt(return_keyframe.timestamp)) {
			if (!local_keyframe.value) continue;
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
		} else {
			break;
		}
	}
	
	//Return statement
	return return_keyframe.value;
};