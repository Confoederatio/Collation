//[VERCENGEN]

//Import libraries
let fs = require("node:fs");
let path = require("node:path");
let readline = require("node:readline");
let { parentPort, workerData } = require("node:worker_threads");

if (!global?.NDJSON) global.NDJSON = {};
if (!global.ve) global.ve = {};

require("../db_shared/NDJSON_history.js"); //Require NDJSON_history.js

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
}

parentPort.on("message", (task) => {
	// Bypasses resource-intensive wait queues for real-time diagnostics
	if (task.type === "get_diagnostics") {
		let memory = process.memoryUsage();
		let v8_stats = require("node:v8").getHeapStatistics();
		
		return parentPort.postMessage({
			task_id: task.task_id,
			results: {
				worker_id: workerData.worker_id,
				rss: memory.rss, // Total Resident Set Size for the whole process
				heapUsed: memory.heapUsed,
				heapTotal: memory.heapTotal,
				heapLimit: v8_stats.heap_size_limit,
				percentage: parseFloat(
					((memory.heapUsed / v8_stats.heap_size_limit) * 100).toFixed(2)
				)
			}
		});
	}
	
	queue.push(task);
	if (!processing) processQueue();
});

async function handleTask (arg0_task) {
	//Convert from parameters
	let task = arg0_task;
	
	//Declare internal helper functions
	let forEachLine = async (filePath, callback) => {
		if (fs.existsSync(filePath)) {
			let rl = readline.createInterface({
				input: fs.createReadStream(filePath)
			});
			for await (let line of rl) {
				let match = line.match(/^"([^"]+)"\s*:/);
				let result;
				
				if (match) {
					let key = match[1];
					let val_str = getCleanValue(
						line.substring(line.indexOf(":") + 1)
					);
					result = await callback(key, val_str, line);
				} else {
					result = await callback(null, null, line);
				}
				
				if (result === false) {
					rl.close();
					break;
				}
			}
		}
	};
	let getCleanValue = (string) => {
		let clean = string.trim();
		if (clean.endsWith(",")) clean = clean.slice(0, -1);
		
		//Return statement
		return clean;
	};
	let resolveHistory = (data, timestamp, options) => {
		let history_obj = (typeof data.history === "string") ?
			JSON.parse(data.history) : data.history;
		
		//Return statement
		if (history_obj && history_obj.keyframes) {
			if (options?.type === "get_keyframes")
				return History.getKeyframes(history_obj.keyframes);
			return History.getKeyframe(history_obj.keyframes, timestamp);
		}
		return null;
	};
	
	//Declare local instance variables
	let {
		file_path, id, limit_end, keyframes, update_map, query, task_id, timestamp, type
	} = task; //Destructure parameters from task
	let page_file = path.join(`${file_path}.tmpndjson`, `${workerData.worker_id}.ndjson`);
	
	//diff: parses the .history.keyframes for an individual ID
	if (type === "diff") {
		let found = null;
		
		await forEachLine(page_file, (key, val_str) => {
			if (key === id) {
				try {
					let state_val = resolveHistory(JSON.parse(val_str), timestamp);
					if (state_val !== null) found = { key: id, value: state_val };
				} catch (e) {}
				return false; // Break the stream reader
			}
		});
		
		//Return statement
		return parentPort.postMessage({ task_id, results: found });
	}
	
	//diff_all: parses `.history.keyframes` for all individual IDs.
	if (type === "diff_all") {
		let list = [];
		
		await forEachLine(page_file, (key, val_str) => {
			try {
				let entity_obj = JSON.parse(val_str);
				let state_val = resolveHistory(entity_obj, timestamp);
				
				if (state_val !== null) {
					list.push({
						key,
						class_name: entity_obj.class_name,
						value: state_val
					});
				} else {
					list.push({
						key,
						class_name: entity_obj.class_name,
						entity_obj: entity_obj
					});
				}
			} catch (e) {}
		});
		
		//Return statement
		return parentPort.postMessage({ task_id, results: list });
	}
	
	if (type === "get_keyframes") {
		let found = null;
		
		await forEachLine(page_file, (key, val_str) => {
			if (key === id) {
				try {
					let state_val = resolveHistory(JSON.parse(val_str), undefined, {
						type: "get_keyframes"
					});
					if (state_val !== null) found = { key: id, value: state_val };
				} catch (e) {}
				return false; // Break the stream reader
			}
		});
		
		//Return statement
		return parentPort.postMessage({ task_id, results: found });
	}
	
	//get_value: returns the Object representing an ID.
	if (type === "get_value") {
		let found = null;
		
		await forEachLine(page_file, (key, val_str) => {
			if (key === id) {
				try { found = JSON.parse(val_str); } catch (e) {}
				return false; // Break the stream reader
			}
		});
		
		//Return statement
		return parentPort.postMessage({ task_id, results: found });
	}
	
	//query: queries an Object based on strict matches, and returns an Array<Object>.
	if (type === "query") {
		let list = [];
		
		await forEachLine(page_file, (key, val_str) => {
			if (limit_end !== undefined && list.length >= limit_end) return false; // Break early
			
			try {
				let obj = JSON.parse(val_str);
				let matches = true;
				
				for (let query_key in query)
					if (Object.getValue(obj, query_key) !== query[query_key]) {
						matches = false;
						break;
					}
				if (matches) {
					if (typeof obj === "object" && obj !== null) obj._id = key;
					list.push(obj);
				}
			} catch (e) {}
		});
		
		//Return statement
		return parentPort.postMessage({ task_id, results: list });
	}
	
	//set_keyframes: sets/updates the .history.keyframes for an individual ID.
	if (type === "set_keyframes") {
		let tmp_file = `${page_file}.tmp_${Date.now()}`;
		let updated = false;
		
		if (!fs.existsSync(path.dirname(page_file)))
			fs.mkdirSync(path.dirname(page_file), { recursive: true });
		
		if (fs.existsSync(page_file)) {
			let ws = fs.createWriteStream(tmp_file);
			
			await forEachLine(page_file, (key, val_str, line) => {
				if (key === id) {
					try {
						let obj = JSON.parse(val_str);
						let is_history_string = (typeof obj.history === "string");
						let history_obj;
						
						if (is_history_string) {
							try {
								history_obj = JSON.parse(obj.history);
							} catch (e) {
								history_obj = {};
							}
						} else {
							history_obj = obj.history || {};
						}
						
						history_obj.keyframes = keyframes;
						
						if (is_history_string) {
							obj.history = JSON.stringify(history_obj);
						} else {
							obj.history = history_obj;
						}
						
						ws.write(`"${key}":${JSON.stringify(obj)}\n`);
						updated = true;
					} catch (e) {
						ws.write(line + "\n");
					}
				} else ws.write(line + "\n");
			});
			
			ws.end();
			await new Promise(r => ws.on("finish", r));
		} else {
			let ws = fs.createWriteStream(tmp_file);
			ws.end();
			await new Promise(r => ws.on("finish", r));
		}
		
		if (!updated) {
			let append_ws = fs.createWriteStream(tmp_file, { flags: "a" });
			let new_obj = {
				history: {
					keyframes: keyframes
				}
			};
			append_ws.write(`"${id}":${JSON.stringify(new_obj)}\n`);
			append_ws.end();
			await new Promise(r => append_ws.on("finish", r));
		}
		
		fs.renameSync(tmp_file, page_file);
		
		//Return statement
		return parentPort.postMessage({ task_id, results: true });
	}
	
	//set_values: sets multiple key-value pairs in the NDJSON partition.
	if (type === "set_values") {
		let tmp_file = `${page_file}.tmp_${Date.now()}`;
		let updated_keys = new Set();
		
		if (!fs.existsSync(path.dirname(page_file)))
			fs.mkdirSync(path.dirname(page_file), { recursive: true });
		
		if (fs.existsSync(page_file)) {
			let ws = fs.createWriteStream(tmp_file);
			
			await forEachLine(page_file, (key, val_str, line) => {
				if (key) {
					if (update_map.hasOwnProperty(key)) {
						let new_val = update_map[key];
						
						//Write new value, completely overriding the old key
						if (new_val !== null)
							ws.write(`"${key}":${JSON.stringify(new_val)}\n`);
						
						updated_keys.add(key);
					} else ws.write(line + "\n");
				} else ws.write(line + "\n");
			});
			
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
		
		//Return statement
		return parentPort.postMessage({ task_id, results: true });
	}
}

async function processQueue () {
	processing = true;
	while (queue.length > 0) {
		let task = queue.shift();
		await handleTask(task);
	}
	processing = false;
}