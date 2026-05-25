//[VERCENGEN]

//Import libraries
let fs = require("node:fs");
let path = require("node:path");
let readline = require("node:readline");
let { parentPort, workerData } = require("node:worker_threads");

if (!global.ve) global.ve = {};

//Declare variables
let processing = false;
let queue = [];

//Internal helper functions
{
	Object.getValue = function (arg0_object, arg1_variable_string) {
		//Convert from parameters
		let object = arg0_object;
		let variable_string = (arg1_variable_string) ? arg1_variable_string : "";
		
		//Return statement
		return variable_string.split(".")
		.reduce((local_object, local_key) => local_object?.[local_key], object);
	};
	ve.NDJSON_resolveStateAtTimestamp = function (arg0_keyframes, arg1_timestamp) {
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
}

parentPort.on("message", (task) => {
	queue.push(task);
	if (!processing) processQueue();
});

async function processQueue () {
	processing = true;
	while (queue.length > 0) {
		let task = queue.shift();
		await handleTask(task);
	}
	processing = false;
}

async function handleTask (task) {
	let resolveHistory = (data, ts) => {
		let history_obj = (typeof data.history === "string") ? JSON.parse(data.history) : data.history;
		if (history_obj && history_obj.keyframes) return ve.NDJSON_resolveStateAtTimestamp(history_obj.keyframes, ts);
		return null;
	};
	
	let getCleanVal = (str) => {
		let clean = str.trim();
		if (clean.endsWith(",")) clean = clean.slice(0, -1);
		return clean;
	};
	
	let { type, file_path, task_id, timestamp, id, update_map, query, limit_end } = task;
	let page_file = path.join(`${file_path}.tmpndjson`, `${workerData.worker_id}.ndjson`);
	
	if (type === "diff") {
		let found = null;
		if (fs.existsSync(page_file)) {
			let rl = readline.createInterface({ input: fs.createReadStream(page_file) });
			for await (let line of rl) {
				let match = line.match(/^"([^"]+)"\s*:/);
				if (match && match[1] === id) {
					let val_str = getCleanVal(line.substring(line.indexOf(":") + 1));
					try {
						let state_val = resolveHistory(JSON.parse(val_str), timestamp);
						if (state_val !== null) found = { key: id, value: state_val };
					} catch(e) {}
					break;
				}
			}
		}
		return parentPort.postMessage({ task_id, results: found });
	}
	
	if (type === "diff_all") {
		let list = [];
		if (fs.existsSync(page_file)) {
			let rl = readline.createInterface({ input: fs.createReadStream(page_file) });
			for await (let line of rl) {
				let match = line.match(/^"([^"]+)"\s*:/);
				if (match) {
					let val_str = getCleanVal(line.substring(line.indexOf(":") + 1));
					try {
						let state_val = resolveHistory(JSON.parse(val_str), timestamp);
						if (state_val !== null) list.push({ key: match[1], value: state_val });
					} catch(e) {}
				}
			}
		}
		return parentPort.postMessage({ task_id, results: list });
	}
	
	if (type === "get_value") {
		let found = null;
		if (fs.existsSync(page_file)) {
			let rl = readline.createInterface({ input: fs.createReadStream(page_file) });
			for await (let line of rl) {
				let match = line.match(/^"([^"]+)"\s*:/);
				if (match && match[1] === id) {
					let val_str = getCleanVal(line.substring(line.indexOf(":") + 1));
					try { found = JSON.parse(val_str); } catch(e) {}
					break;
				}
			}
		}
		return parentPort.postMessage({ task_id, results: found });
	}
	
	if (type === "query") {
		let list = [];
		if (fs.existsSync(page_file)) {
			let rl = readline.createInterface({ input: fs.createReadStream(page_file) });
			for await (let line of rl) {
				if (limit_end !== undefined && list.length >= limit_end) break;
				let match = line.match(/^"([^"]+)"\s*:/);
				if (match) {
					let val_str = getCleanVal(line.substring(line.indexOf(":") + 1));
					try {
						let obj = JSON.parse(val_str);
						let matches = true;
						for (let qk in query) {
							if (obj[qk] !== query[qk]) { matches = false; break; }
						}
						if (matches) {
							if (typeof obj === "object" && obj !== null) obj._id = match[1];
							list.push(obj);
						}
					} catch(e) {}
				}
			}
		}
		return parentPort.postMessage({ task_id, results: list });
	}
	
	if (type === "set_values") {
		let tmp_file = `${page_file}.tmp_${Date.now()}`;
		let updated_keys = new Set();
		
		if (!fs.existsSync(path.dirname(page_file))) fs.mkdirSync(path.dirname(page_file), { recursive: true });
		
		if (fs.existsSync(page_file)) {
			let rl = readline.createInterface({ input: fs.createReadStream(page_file) });
			let ws = fs.createWriteStream(tmp_file);
			
			for await (let line of rl) {
				let match = line.match(/^"([^"]+)"\s*:/);
				if (match) {
					let key = match[1];
					if (update_map.hasOwnProperty(key)) {
						let new_val = update_map[key];
						
						//Write new value, completely overriding the old key
						if (new_val !== null)
							ws.write(`"${key}":${JSON.stringify(new_val)}\n`);
						
						updated_keys.add(key);
					} else ws.write(line + "\n");
				} else ws.write(line + "\n");
			}
			
			ws.end();
			await new Promise(r => ws.on("finish", r));
		} else {
			let ws = fs.createWriteStream(tmp_file);
			ws.end();
			await new Promise(r => ws.on("finish", r));
		}
		
		let append_ws = fs.createWriteStream(tmp_file, { flags: "a" });
		for (let key in update_map)
			if (!updated_keys.has(key) && update_map[key] !== null)
				append_ws.write(`"${key}":${JSON.stringify(update_map[key])}\n`);
		
		append_ws.end();
		await new Promise(r => append_ws.on("finish", r));
		
		fs.renameSync(tmp_file, page_file);
		return parentPort.postMessage({ task_id, results: true });
	}
}