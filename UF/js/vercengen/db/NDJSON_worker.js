//[VERCENGEN]

//Import libraries
let fs = require("node:fs");
let path = require("node:path");
let readline = require("node:readline");
let { parentPort, workerData } = require("node:worker_threads");

if (!global?.NDJSON) global.NDJSON = {};
if (!global.ve) global.ve = {};

require("../db/NDJSON_history.js"); //Require NDJSON_history.js

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
	let getCleanVal = (string) => {
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
		file_path, id, limit_end, update_map, query, task_id, timestamp, type
	} = task; //Destructure parameters from task
	let page_file = path.join(`${file_path}.tmpndjson`, `${workerData.worker_id}.ndjson`);
	
	//diff: parses the .history.keyframes for an individual ID
	if (type === "diff") {
		let found = null;
		
		if (fs.existsSync(page_file)) {
			let rl = readline.createInterface({
				input: fs.createReadStream(page_file)
			});
			for await (let line of rl) {
				let match = line.match(/^"([^"]+)"\s*:/);
				if (match && match[1] === id) {
					let val_str = getCleanVal(line.substring(line.indexOf(":") + 1));
					try {
						let state_val = resolveHistory(JSON.parse(val_str), timestamp);
						if (state_val !== null) found = { key: id, value: state_val };
					} catch (e) {}
					break;
				}
			}
		}
		
		//Return statement
		return parentPort.postMessage({ task_id, results: found });
	}
	
	//diff_all: parses `.history.keyframes` for all individual IDs.
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
		
		//Return statement
		return parentPort.postMessage({ task_id, results: list });
	}
	
	if (type === "get_keyframes") {
		let found = null;
		
		if (fs.existsSync(page_file)) {
			let rl = readline.createInterface({
				input: fs.createReadStream(page_file)
			});
			for await (let line of rl) {
				let match = line.match(/^"([^"]+)"\s*:/);
				if (match && match[1] === id) {
					let val_str = getCleanVal(line.substring(line.indexOf(":") + 1));
					try {
						let state_val = resolveHistory(JSON.parse(val_str), undefined, { 
							type: "get_keyframes" 
						});
						if (state_val !== null) found = { key: id, value: state_val };
					} catch (e) {}
					break;
				}
			}
		}
		
		//Return statement
		return parentPort.postMessage({ task_id, results: found });
	}
	
	//get_value: returns the Object representing an ID.
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
		
		//Return statement
		return parentPort.postMessage({ task_id, results: found });
	}
	
	//query: queries an Object based on strict matches, and returns an Array<Object>.
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
						
						for (let query_key in query)
							if (Object.getValue(obj, query_key) !== query[query_key]) { matches = false; break; }
						if (matches) {
							if (typeof obj === "object" && obj !== null) obj._id = match[1];
							list.push(obj);
						}
					} catch(e) {}
				}
			}
		}
		
		//Return statement
		return parentPort.postMessage({ task_id, results: list });
	}
	
	//set_values: sets multiple key-value pairs in the NDJSON partition.
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