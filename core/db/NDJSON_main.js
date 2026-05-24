//[VERCENGEN]

//Import libraries
let fs = require("node:fs");
let path = require("node:path");
let os = require("node:os");
let v8 = require("node:v8");
let readline = require("node:readline");
let NodeWorker = require("node:worker_threads").Worker;

if (!global.ve) global.ve = {};

//Init functions
{
	ve.NDJSON_diff = async function (arg0_file_path, arg1_id, arg2_options) {
		//Convert from parameters
		let file_path = path.resolve(arg0_file_path);
		let options = arg2_options ? arg2_options : {};
		
		//Declare local instance variables
		let pool = ve.NDJSON_getWorkerPool();
		let worker_id = ve.NDJSON_getWorkerId(arg1_id, pool.length);
		let task_id = global.ve.ndjson_task_id_counter++;
		
		//Return statement
		return new Promise((resolve) => {
			global.ve.ndjson_pending_tasks.set(task_id, resolve);
			pool[worker_id].postMessage({
				type: "diff",
				task_id: task_id,
				file_path: file_path,
				id: arg1_id,
				timestamp: options.timestamp
			});
		});
	};
	
	ve.NDJSON_diffAll = async function (arg0_file_path, arg1_options) {
		//Convert from parameters
		let file_path = path.resolve(arg0_file_path);
		let options = (arg1_options) ? arg1_options : {};
		
		//Declare local instance variables
		let pool = ve.NDJSON_getWorkerPool();
		let promises = [];
		
		for (let i = 0; i < pool.length; i++) {
			let task_id = global.ve.ndjson_task_id_counter++;
			promises.push(new Promise((resolve) => {
				global.ve.ndjson_pending_tasks.set(task_id, resolve);
				pool[i].postMessage({ type: "diff_all", task_id: task_id, file_path: file_path, timestamp: options.timestamp });
			}));
		}
		
		let results = await Promise.all(promises);
		
		//Return statement
		return results.filter(v => v !== null).flat();
	};
	
	ve.NDJSON_getValue = async function (arg0_file_path, arg1_id) {
		//Convert from parameters
		let file_path = path.resolve(arg0_file_path);
		
		//Declare local instance variables
		let pool = ve.NDJSON_getWorkerPool();
		let worker_id = ve.NDJSON_getWorkerId(arg1_id, pool.length);
		let task_id = global.ve.ndjson_task_id_counter++;
		
		//Return statement
		return new Promise((resolve) => {
			global.ve.ndjson_pending_tasks.set(task_id, resolve);
			pool[worker_id].postMessage({ type: "get_value", task_id: task_id, file_path: file_path, id: arg1_id });
		});
	};
	
	ve.NDJSON_getWorkerId = function (arg0_id, arg1_pool_length) {
		//Declare local instance variables
		let hash = 0;
		let id_str = arg0_id.toString();
		
		for (let i = 0; i < id_str.length; i++) {
			hash = ((hash << 5) - hash) + id_str.charCodeAt(i);
			hash |= 0;
		}
		
		//Return statement
		return Math.abs(hash) % arg1_pool_length;
	};
	
	ve.NDJSON_getWorkerPool = function (arg0_max_workers) {
		//Convert from parameters
		let max_workers = Math.returnSafeNumber(arg0_max_workers, os.cpus().length - 1);
		
		//Init workerpool variables
		if (global.ve.ndjson_pending_tasks === undefined) global.ve.ndjson_pending_tasks = new Map();
		if (global.ve.ndjson_task_id_counter === undefined) global.ve.ndjson_task_id_counter = 0;
		if (global.ve.ndjson_worker_pool === undefined) global.ve.ndjson_worker_pool = [];
		
		//Declare local instance variables
		if (global.ve.ndjson_worker_pool.length === 0)
			for (let i = 0; i < max_workers; i++) {
				let worker = new NodeWorker("./core/db/NDJSON_worker.js", { workerData: { worker_id: i } });
				worker.on("message", (response) => {
					let callback = global.ve.ndjson_pending_tasks.get(response.task_id);
					if (callback) {
						callback(response.results !== undefined ? response.results : true);
						global.ve.ndjson_pending_tasks.delete(response.task_id);
					}
				});
				global.ve.ndjson_worker_pool.push(worker);
			}
		
		//Return statement
		return global.ve.ndjson_worker_pool;
	};
	
	ve.NDJSON_load = async function (arg0_file_path, arg1_options) {
		//Convert from parameters		
		let file_path = path.resolve(arg0_file_path);
		let options = (arg1_options) ? arg1_options : {};
		
		//Initialise options
		options.dynamic_chunk_size = Math.returnSafeNumber(options.dynamic_chunk_size, 64*1024*1024);
		options.dynamic_max_workers = Math.returnSafeNumber(options.dynamic_max_workers, os.cpus().length - 1);
		options.ram_threshold = Math.returnSafeNumber(options.ram_threshold, 0.50);
		
		//Declare local instance variables
		let _dynamic_chunk_size = structuredClone(options.dynamic_chunk_size);
		let _dynamic_max_workers = structuredClone(options.dynamic_max_workers);
		let heap_limit = v8.getHeapStatistics().heap_size_limit;
		let stats = await fs.promises.stat(file_path);
		
		let active_workers = 0;
		let current_offset = 0;
		let global_depth = 0;
		let write_stream = fs.createWriteStream(`${file_path}.ndjson`);
		
		//Initialise logic functions
		let refreshLimits = () => {
			let memory = process.memoryUsage();
			let memory_usage = memory.heapUsed;
			let available_buffer = (heap_limit*options.ram_threshold) - memory_usage;
			
			if (available_buffer < 0) {
				_dynamic_chunk_size = Math.max(1024*1024, _dynamic_chunk_size*0.9);
				_dynamic_max_workers = Math.max(1, _dynamic_max_workers - 1);
			} else {
				_dynamic_chunk_size = Math.min(128*1024*1024, Math.floor(available_buffer*options.ram_threshold));
				_dynamic_max_workers = Math.min(os.cpus().length - 1, _dynamic_max_workers + 1);
			}
		};
		
		//Return statement
		return new Promise((resolve, reject) => {
			let processNextChunk = () => {
				if (current_offset >= stats.size) {
					if (active_workers === 0) {
						write_stream.end(async () => {
							await ve.NDJSON_partitionFile(`${file_path}.ndjson`);
							resolve(`${file_path}.ndjson`);
						});
					}
					return;
				}
				
				refreshLimits();
				if (active_workers < _dynamic_max_workers) {
					let start = current_offset;
					let end = Math.min(start + _dynamic_chunk_size - 1, stats.size - 1);
					
					active_workers++;
					current_offset = end + 1;
					
					let worker = new NodeWorker("./UF/js/vercengen/workers/worker_vercengen_ndjson.js", {
						workerData: { file_path, start, end, initial_depth: global_depth }
					});
					worker.on("message", (message) => {
						global_depth = message.final_depth;
						let can_write = write_stream.write(message.transformed_data);
						let continueProcessing = () => {
							active_workers--;
							processNextChunk();
						}
						
						if (!can_write) write_stream.once("drain", continueProcessing);
						else setImmediate(continueProcessing);
					});
					worker.on("error", reject);
					
					if (active_workers < _dynamic_max_workers) processNextChunk();
				}
			};
			processNextChunk();
		});
	};
	
	ve.NDJSON_partitionFile = async function (arg0_file_path) {
		//Convert from parameters
		let file_path = path.resolve(arg0_file_path);
		
		//Declare local instance variables
		let dir = `${file_path}.tmpndjson`;
		let pool = ve.NDJSON_getWorkerPool();
		let write_streams = {};
		
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
		for (let i = 0; i < pool.length; i++)
			write_streams[i] = fs.createWriteStream(path.join(dir, `${i}.ndjson`));
		
		let rl = readline.createInterface({ input: fs.createReadStream(file_path) });
		
		for await (let line of rl) {
			let match = line.match(/^"([^"]+)"\s*:/);
			if (match) {
				let wid = ve.NDJSON_getWorkerId(match[1], pool.length);
				let clean_line = line.trim();
				if (clean_line.endsWith(",")) clean_line = clean_line.slice(0, -1);
				
				if (!write_streams[wid].write(clean_line + "\n"))
					await new Promise(r => write_streams[wid].once("drain", r));
			}
		}
		
		for (let i = 0; i < pool.length; i++) {
			write_streams[i].end();
			await new Promise(r => write_streams[i].on("finish", r));
		}
	};
	
	ve.NDJSON_query = async function (arg0_file_path, arg1_query_obj, arg2_options) {
		//Convert from parameters
		let file_path = path.resolve(arg0_file_path);
		let query_obj = arg1_query_obj ? arg1_query_obj : {};
		let options = arg2_options ? arg2_options : {};
		
		//Declare local instance variables
		let pool = ve.NDJSON_getWorkerPool();
		let promises = [];
		let limit_start = Math.returnSafeNumber(options.limit_start, 0);
		let limit_end = options.limit_end;
		
		for (let i = 0; i < pool.length; i++) {
			let task_id = global.ve.ndjson_task_id_counter++;
			promises.push(
				new Promise((resolve) => {
					global.ve.ndjson_pending_tasks.set(task_id, resolve);
					pool[i].postMessage({ type: "query", task_id: task_id, file_path: file_path, query: query_obj, limit_end: limit_end });
				})
			);
		}
		
		let results = await Promise.all(promises);
		let final_results = results.filter(v => v !== null).flat();
		
		//Return statement
		if (limit_end !== undefined) return final_results.slice(limit_start, limit_end);
		else if (limit_start > 0) return final_results.slice(limit_start);
		return final_results;
	};
	
	ve.NDJSON_removeValue = async function (arg0_file_path, arg1_id) {
		let map = {};
		map[arg1_id] = null;
		
		//Return statement
		return await ve.NDJSON_setValues(arg0_file_path, map);
	};
	
	ve.NDJSON_removeValues = async function (arg0_file_path, arg1_ids) {
		let map = {};
		for (let i = 0; i < arg1_ids.length; i++) map[arg1_ids[i]] = null;
		
		//Return statement
		return await ve.NDJSON_setValues(arg0_file_path, map);
	};
	
	ve.NDJSON_save = async function (arg0_file_path) {
		//Convert from parameters
		let file_path = path.resolve(arg0_file_path);
		
		//Declare local instance variables
		let dir = `${file_path}.tmpndjson`;
		let pool = ve.NDJSON_getWorkerPool();
		
		if (!fs.existsSync(dir)) return;
		
		let ws = fs.createWriteStream(file_path); // Overwrite target .ndjson
		ws.write("{\n");
		
		let first = true;
		for (let i = 0; i < pool.length; i++) {
			let page_file = path.join(dir, `${i}.ndjson`);
			if (fs.existsSync(page_file)) {
				let rl = readline.createInterface({ input: fs.createReadStream(page_file) });
				for await (let line of rl) {
					if (line.trim().length === 0) continue;
					if (!first) ws.write(",\n");
					ws.write(line.trim());
					first = false;
				}
			}
		}
		
		ws.write("\n}");
		ws.end();
		await new Promise(r => ws.on("finish", r));
		fs.rmSync(dir, { recursive: true, force: true });
	};
	
	ve.NDJSON_setValue = async function (arg0_file_path, arg1_id, arg2_value) {
		let map = {};
		map[arg1_id] = arg2_value;
		
		//Return statement
		return await ve.NDJSON_setValues(arg0_file_path, map);
	};
	
	ve.NDJSON_setValues = async function (arg0_file_path, arg1_update_map) {
		//Convert from parameters
		let file_path = path.resolve(arg0_file_path);
		let update_map = (arg1_update_map) ? arg1_update_map : {};
		
		//Declare local instance variables
		let pool = ve.NDJSON_getWorkerPool();
		let updates_by_worker = {};
		let promises = [];
		
		for (let key in update_map) {
			let wid = ve.NDJSON_getWorkerId(key, pool.length);
			if (!updates_by_worker[wid]) updates_by_worker[wid] = {};
			updates_by_worker[wid][key] = update_map[key];
		}
		
		for (let wid in updates_by_worker) {
			let task_id = global.ve.ndjson_task_id_counter++;
			promises.push(new Promise((resolve) => {
				global.ve.ndjson_pending_tasks.set(task_id, resolve);
				pool[wid].postMessage({
					type: "set_values",
					task_id: task_id,
					file_path: file_path,
					update_map: updates_by_worker[wid]
				});
			}));
		}
		
		await Promise.all(promises);
		
		//Return statement
		return true;
	};
}