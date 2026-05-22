const { parentPort } = require("node:worker_threads");
const fs = require("node:fs");
const readline = require("readline");

if (!global.ve) global.ve = {};

//Declare worker variables
const NL_LEN = 1;
let file_index = new Map(); //Map<key, { start: number, end: number }>
let indexed_mtime = 0;

//Initialise functions
{
	ve.NDJSON_resolveStateAtTimestamp = function (arg0_keyframes, arg1_timestamp) {
		//Convert from parameters
		let keyframes = arg0_keyframes;
		let timestamp = parseInt(arg1_timestamp);
		
		//Declare local instance variables
		let all_timestamps = Object.keys(keyframes).map(Number).sort((a, b) => a - b);
		let result_value = [];
		
		for (let i = 0; i < all_timestamps.length; i++) {
			let local_timestamp = all_timestamps[i];
			if (local_timestamp > timestamp) break;
			
			let local_payload = keyframes[local_timestamp.toString()];
			if (local_payload)
				if (local_payload.value)
					for (let x = 0; x < local_payload.value.length; x++) {
						let current_val = local_payload.value[x];
						
						if (typeof current_val === "object" && current_val !== null) {
							//Handle Object Merging
							let old_variables = (result_value[x] && result_value[x].variables) ?
								result_value[x].variables : {};
							
							if (!result_value[x]) result_value[x] = {};
							
							result_value[x] = {
								...result_value[x],
								...current_val
							};
							
							//Handle nested .variables
							if (current_val.variables)
								result_value[x].variables = {
									...old_variables,
									...current_val.variables
								};
						} else if (current_val !== undefined) {
							if (current_val === "undefined") continue;
							if (x !== 0 && current_val === null) continue;
							
							result_value[x] = current_val;
						}
					}
		}
		
		//Return statement
		return result_value;
	};
}

parentPort.on("message", async (task) => {
	//Declare local instance variables
	let { type, file_path, start, end, task_id, timestamp, id, mtime } = task;
	
	//type: index - map IDs to byte offsets
	if (type === "index") {
		//Clear index if file was modified
		if (mtime !== indexed_mtime) {
			file_index.clear();
			indexed_mtime = mtime;
		}
		
		let current_offset = start;
		let stream = fs.createReadStream(file_path, { start, end });
		let rl = readline.createInterface({ input: stream, terminal: false });
		let is_first_line = true;
		
		for await (let line of rl) {
			let line_len = Buffer.byteLength(line, "utf8") + NL_LEN;
			
			//Skip partial lines at chunk starts
			if (start > 0 && is_first_line) {
				current_offset += line_len;
				is_first_line = false;
				continue;
			}
			is_first_line = false;
			
			let trimmed = line.trim();
			let match = trimmed.match(/^"([^"]+)"\s*:/);
			
			if (match)
				file_index.set(match[1], {
					start: current_offset,
					end: current_offset + line_len
				});
			
			current_offset += line_len;
		}
		
		//Return statement
		return parentPort.postMessage({ task_id, status: "indexed", count: file_index.size });
	}
	
	//type: diff_all/diff
	if (type === "diff" || type === "diff_all") {
		let results_list = [];
		let targets = [];
		
		if (type === "diff") {
			targets = [[id, file_index.get(id)]];
		} else {
			targets = Array.from(file_index.entries());
		}
		
		//Iterate over all targets
		for (let i = 0; i < targets.length; i++) {
			let local_id = targets[i][0];
			let target = targets[i][1];
			
			if (target) {
				try {
					const line = await new Promise((resolve) => {
						let s = fs.createReadStream(file_path, { start: target.start, end: target.end });
						let r = readline.createInterface({ input: s });
						r.on("line", (l) => { resolve(l); r.close(); });
					});
					
					let json_start = line.indexOf(":");
					let raw_json = line.substring(json_start + 1).trim();
					
					if (raw_json.endsWith(",")) raw_json = raw_json.slice(0, -1);
					if (raw_json.endsWith("}}"))
						if (!raw_json.includes('{"id"'))
							raw_json = raw_json.slice(0, -1);
					
					let data = JSON.parse(raw_json);
					let history_obj = (typeof data.history === "string") ?
						JSON.parse(data.history) : data.history;
					
					if (history_obj)
						if (history_obj.keyframes) {
							let diffed_val = ve.NDJSON_resolveStateAtTimestamp(history_obj.keyframes, timestamp);
							
							if (type === "diff")
								return parentPort.postMessage({
									task_id,
									results: { key: local_id, value: diffed_val }
								});
							
							results_list.push({ key: local_id, value: diffed_val });
						}
				} catch (e) {}
			}
		}
		
		//Return statement
		let final_results = (type === "diff") ? null : results_list;
		parentPort.postMessage({ task_id, results: final_results });
	}
});