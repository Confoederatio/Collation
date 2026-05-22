//Import libraries
if (!global.ve) global.ve = {};

if (!global.fs) try { fs = require("fs"); } catch (e) {}
if (!global.readline) try { global.readline = require("readline"); } catch (e) {}
let { parentPort } = require("node:worker_threads");

//Declare worker variables
let file_index = new Map(); //Map<key, { start: number, end: number }>
let indexed_mtime = 0;

//Initialise functions
{
	ve.NDJSON_resolveStateAtTimestamp = function (arg0_keyframes, arg1_timestamp) {
		//Convert from parameters
		let keyframes = arg0_keyframes;
		let timestamp = arg1_timestamp;
		
		//Declare local instance variables
		let all_timestamps = Object.keys(keyframes).map(Number)
			.sort((a, b) => a - b);
		let result_value = [];
		
		for (let local_timestamp of all_timestamps) {
			if (local_timestamp > timestamp) break;
			let local_value = keyframes[local_timestamp].value;
			
			for (let x = 0; x < local_value.length; x++) {
				let current_value = local_value[x];
				
				if (typeof current_value === "object" && current_value !== null) {
					if (!result_value[x]) result_value[x] = { variables: {} };
					let old_variables = (result_value[x].variables || {});
					
					result_value[x] = { ...result_value[x], ...current_value };
					if (current_value.variables)
						result_value[x].variables = {
							...old_variables,
							...current_value.variables
						};
				} else if (current_value !== undefined && current_value !== "undefined") {
					result_value[x] = current_value;
				}
			}
		}
		
		//Return statement
		return result_value;
	};
}

parentPort.on("message", async (task) => {
	let { type, file_path, start, end, task_id, timestamp, id, mtime } = task;
	
	//type: diff - returns { key, value } (diffed state)
	if (type === "diff") {
		let target = file_index.get(id);
		if (!target) return parentPort.postMessage({ task_id, results: null }); //Internal guard clause if no target
		
		let stream = fs.createReadStream(file_path, { start, end });
		let rl = readline.createInterface({ input: stream, terminal: false });
		
		//Iterate over all lines in partition
		for await (let local_line of rl) {
			let trimmed = local_line.trim();
				if (trimmed.endsWith(",")) trimmed = trimmed.slice(0, -1);
				
			let json_start = trimmed.indexOf(":");
			try {
				let data = JSON.parse(trimmed.substring(json_start + 1));
				if (data.history && data.history.keyframes) {
					let diffed_value = ve.NDJSON_resolveStateAtTimestamp(data.history.keyframes, timestamp);
					
					//Return statement
					return parentPort.postMessage({ task_id, results: { key: id, value: diffed_value } });
				}
			} catch (e) {
				//Return statement
				return parentPort.postMessage({ task_id, results: null });
			}
		}
	}
	
	//type: get_value - returns a value by its key (ID)
	if (type === "get_value") {
		let target = file_index.get(id);
		if (!target) return parentPort.postMessage({ task_id, results: null }); //Internal guard clause if no target
		
		let stream = fs.createReadStream(file_path, { start, end });
		let rl = readline.createInterface({ input: stream, terminal: false });
		
		//Iterate over all lines in partition
		for await (let local_line of rl) {
			let trimmed = local_line.trim();
				if (trimmed.endsWith(",")) trimmed = trimmed.slice(0, -1);
			
			let json_start = trimmed.indexOf(":");
			
			try {
				let data = JSON.parse(trimmed.substring(json_start + 1));
				
				//Reeturn statement
				return parentPort.postMessage({ task_id, results: data });
			} catch (e) {
				return parentPort.postMessage({ task_id, results: null });
			}
		}
	}
	
	//type: index - map IDs to byte offsets
	if (type === "index") {
		//Clear index if file was modified
		if (mtime !== indexed_mtime) {
			file_index.clear();
			indexed_mtime = mtime;
		}
		
		//Declare local instance variables
		let current_offset = start;
		let stream = fs.createReadStream(file_path, { start, end });
		let rl = readline.createInterface({ input: stream, terminal: false });
		
		//Iterate over all lines in partition
		for await (let local_line of rl) {
			let line_byte_length = Buffer.byteLength(local_line, "utf8") + 1; //+1 for \n
			let trimmed = local_line.trim();
			
			if (trimmed && trimmed !== "{" && trimmed !== "}") {
				let json_start = trimmed.indexOf(":");
				if (json_start !== -1) {
					let key = trimmed.substring(0, json_start)
						.replace(/["']/g, "").trim();
					file_index.set(key, {
						start: current_offset,
						end: current_offset + line_byte_length
					});
				}
			}
			
			current_offset += line_byte_length;
		}
		
		//Return statement
		return parentPort.postMessage({ task_id, status: "indexed" });
	}
});
	
	