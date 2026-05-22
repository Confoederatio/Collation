//Import libraries
if (!global.ve) global.ve = {};

if (!global.electron) try { electron = require("electron"); } catch (e) {}
if (!global.file_read) try { file_read = require("../../file/file_read"); } catch (e) {}
if (!global.fs) try { fs = require("fs"); } catch (e) {}
if (!global.os) global.os = require("node:os");
if (!global.path) try { path = require("path"); } catch (e) {}
if (!global.readline) try { readline = require("readline"); } catch (e) {}
if (!global.v8) global.v8 = require("node:v8");
let NodeWorker = require("node:worker_threads").Worker;

//Math utils - [WIP] - Override at a later date
{
	if (!global.Math) global.Math = {};
	Math.returnSafeNumber = function (arg0_number, arg1_default) {
		//Convert from parameters
		let number = parseFloat(arg0_number);
		let default_value = (arg1_default !== undefined) ? arg1_default : 0;
		
		//Return statement
		return (!isNaN(number) && isFinite(number)) ? number : default_value;
	};
}

//String utils - [WIP] - Override at a later date
{
	String.prototype.hashCode = function () {
		//Declare local instance variables
		let hash = 0;
		
		//Iterate over this.length
		for (let i = 0; i < this.length; i++) {
			hash = (hash << 5) - hash + this.charCodeAt(i);
			hash |= 0;
		}
		
		//Return statement
		return hash;
	};
}

//Initialise functions
{
	/**
	 * Initialises IPC handlers.
	 * 
	 * ontology:initialise - Initialises Ontology streaming.
	 * - ontology:stream-batch - DB sends batch to render.
	 * - ontology:stream-done - Marks all streaming as finished (loaded into memory).
	 * - ontology:stream-next - Render requests batch from DB.
	 * 
	 * @param {Object} [arg0_options]
	 *  @param {number} [arg0_options.ontology_stream_size=256] - The stream packet size for Ontologies from DB.
	 */
	ve.initialiseIPC = function (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Initialise options
		options.ontology_stream_size = (options.ontology_stream_size > 0) ?
			options.ontology_stream_size : 256;
		
		//Declare local instance variables
		let ipc_main = electron.ipcMain;
		
		ipc_main.on("ontology:initialise", async (event, folder_path) => {
			//Declare local instance variables
			if (!fs.existsSync(folder_path)) fs.mkdirSync(folder_path, { recursive: true });
			let all_files = fs.readdirSync(folder_path)
				.filter((f) => f.endsWith(".ontology"))
				.sort((a, b) => b.localeCompare(a));
			let web_contents = event.sender;
			
			async function* getOntologyBatches () {
				let batch = {};
				let count = 0;
				
				for (let local_file of all_files) {
					let local_file_path = path.join(folder_path, local_file);
					
					//Process each file backwards line-by-line
					for await (let local_line of global.file_read.readLinesBackwards(local_file_path)) {
						if (!local_line.trim()) continue;
						
						let json_start = local_line.indexOf("{");
						if (json_start === -1) continue;
						
						let id = local_line.substring(0, json_start).trim();
						try {
							let local_keyframe = JSON.parse(local_line.substring(json_start));
								local_keyframe._saved = true;
							
							if (!batch[id]) batch[id] = [];
							batch[id].push(local_keyframe);
							count++;
							
							//Smaller batch size (256) is better for IPC stability
							if (count >= options.ontology_stream_size) {
								yield batch;
								batch = {};
								count = 0;
							}
						} catch (e) {}
					}
				}
				if (Object.keys(batch).length > 0) yield batch;
			}
			
			let currentStream = getOntologyBatches();
			let sendNextBatch = async () => {
				let { value, done } = await currentStream.next();
				
				if (done) {
					web_contents.send('ontology:stream-done');
					ipc_main.removeListener('ontology:stream-next', sendNextBatch);
				} else {
					web_contents.send('ontology:stream-batch', value);
				}
			};
			
			//Stream in batches
			ipc_main.removeAllListeners('ontology:stream-next');
			ipc_main.on('ontology:stream-next', sendNextBatch);
			await sendNextBatch();
		});
	};
	
	ve.NDJSON_checkIndex = async function (arg0_file_path, arg1_options) {
		//Convert from parameters
		let file_path = path.resolve(arg0_file_path);
		let options = (arg1_options) ? arg1_options : {};
		
		//Declare local instance variables
		let stats = await fs.promises.stat(file_path);
		
		if (ve.ndjson_file_metadata?.[file_path] !== stats.mtimeMs)
			await ve.NDJSON_index(file_path, options);
	};
	
	/**
	 * Sends a query to the .ndjson in question and diffs each Object's `.history.keyframes` for the given date. Sends back Objects with a parsed `.value` field representing the diff.
	 * 
	 * @param {string} arg0_file_path
	 * @param {Object} [arg1_options]
	 *  @param {number} [arg1_options.max_ram=8192] - The amount of RAM to dedicate to diffing/querying the .NDJSON file.
	 *  @param {number} [arg1_options.timestamp]
	 * 
	 * @returns {Object[]}
	 */
	ve.NDJSON_diff = async function (arg0_file_path, arg1_options) {
		//Convert from parameters
		let file_path = path.resolve(arg0_file_path);
		let options = (arg1_options) ? arg1_options : {};
		
		//Reindex, then diff
		await ve.NDJSON_checkIndex(file_path, options);
		
		//Declare local instance variables
		let pool = ve.NDJSON_getWorkerPool();
		let task_id = ve.ndjson_task_id_counter++;
		let worker_index = Math.abs(options.id.hashCode()) % pool.length;
		
		//Return statement
		return new Promise((resolve, reject) => {
			ve.ndjson_pending_tasks.set(task_id, resolve);
			pool[worker_index].postMessage({
				type: "diff",
				task_id,
				file_path: file_path,
				id: options.id,
				timestamp: options.timestamp,
			});
		});
	};
	
	//[QUARANTINE]
	/**
	 * Diffs all objects in the file at a given timestamp.
	 *
	 * @param {string} arg0_file_path
	 * @param {Object} arg1_options
	 *  @param {number} arg1_options.timestamp
	 *
	 * @returns {Promise<Object[]>} Array of { key, value }
	 */
	ve.NDJSON_diffAll = async function (arg0_file_path, arg1_options) {
		let file_path = path.resolve(arg0_file_path);
		let options = (arg1_options) ? arg1_options : {};
		if (!options.timestamp) throw new Error("NDJSON_diffAll requires a timestamp.");
		
		await ve.NDJSON_checkIndex(file_path, options);
		
		let pool = ve.NDJSON_getWorkerPool();
		let promises = [];
		
		for (let i = 0; i < pool.length; i++) {
			let task_id = ve.ndjson_task_id_counter++;
			promises.push(new Promise((resolve) => {
				ve.ndjson_pending_tasks.set(task_id, resolve);
				pool[i].postMessage({ type: "diff_all", task_id, file_path, timestamp: options.timestamp });
			}));
		}
		
		let results_array = await Promise.all(promises);
		//Filter out nulls before flattening
		return results_array.filter(v => v !== null).flat();
	};
	
	/**
	 * Retrieves the full object for a given key.
	 *
	 * @param {string} arg0_file_path
	 * @param {string} arg1_id
	 * @param {Object} [arg2_options]
	 *
	 * @returns {Promise<Object>} The full JSON object found at the index.
	 */
	ve.NDJSON_getValue = async function (arg0_file_path, arg1_id, arg2_options) {
		let file_path = path.resolve(arg0_file_path);
		let options = (arg2_options) ? arg2_options : {};
		await ve.NDJSON_checkIndex(file_path, options);
		
		let pool = ve.NDJSON_getWorkerPool();
		let promises = [];
		
		for (let i = 0; i < pool.length; i++) {
			let task_id = ve.ndjson_task_id_counter++;
			promises.push(new Promise((resolve) => {
				ve.ndjson_pending_tasks.set(task_id, resolve);
				pool[i].postMessage({ type: "get_value", task_id, file_path, id: arg1_id });
			}));
		}
		
		let results = await Promise.all(promises);
		//Find the single worker that actually returned the object
		return results.find(v => v !== null) || null;
	};
	
	ve.NDJSON_getWorkerPool = function (arg0_max_workers) {
		let max_workers = Math.returnSafeNumber(
			arg0_max_workers,
			os.cpus().length - 1
		);
		
		if (global.ve.ndjson_pending_tasks === undefined)
			global.ve.ndjson_pending_tasks = new Map();
		if (global.ve.ndjson_task_id_counter === undefined)
			global.ve.ndjson_task_id_counter = 0;
		if (global.ve.ndjson_worker_pool === undefined)
			global.ve.ndjson_worker_pool = [];
		
		if (ve.ndjson_worker_pool.length === 0)
			for (let i = 0; i < max_workers; i++) {
				let worker = new NodeWorker(
					"./UF/js/vercengen/workers/worker_vercengen_db.js"
				);
				worker.on("message", (response) => {
					let { task_id, results, status } = response;
					let callback = ve.ndjson_pending_tasks.get(task_id);
					
					if (callback) {
						// If indexing, results is undefined, status is "indexed"
						callback(status === "indexed" ? true : results);
						ve.ndjson_pending_tasks.delete(task_id);
					}
				});
				ve.ndjson_worker_pool.push(worker);
			}
		
		return ve.ndjson_worker_pool;
	};
	
	ve.NDJSON_index = async function (arg0_file_path, arg1_options) {
		let file_path = path.resolve(arg0_file_path);
		let options = (arg1_options) ? arg1_options : {};
		let stats = await fs.promises.stat(file_path);
		let mtime = stats.mtimeMs;
		
		let pool = ve.NDJSON_getWorkerPool(options.dynamic_max_workers);
		let chunk_size = Math.ceil(stats.size / pool.length);
		let promises = [];
		
		console.log(`[NDJSON] Indexing ${path.basename(file_path)} (${(stats.size / 1024 / 1024).toFixed(2)} MB)...`);
		
		for (let i = 0; i < pool.length; i++) {
			let task_id = ve.ndjson_task_id_counter++;
			promises.push(new Promise((resolve) => {
				ve.ndjson_pending_tasks.set(task_id, (resp) => {
					// resp is the 'count' from the worker
					resolve(resp);
				});
				pool[i].postMessage({
					type: "index",
					task_id,
					file_path,
					mtime,
					start: i * chunk_size,
					end: (i === pool.length - 1) ? stats.size : (i + 1) * chunk_size
				});
			}));
		}
		
		let counts = await Promise.all(promises);
		let total_keys = counts.reduce((a, b) => a + b, 0);
		console.log(`[NDJSON] Indexing complete. Found ${total_keys} keys across ${pool.length} workers.`);
		
		if (!global.ve.ndjson_file_metadata) global.ve.ndjson_file_metadata = {};
		ve.ndjson_file_metadata[file_path] = mtime;
	};
	
	/**
	 * Parses a file into NDJSON.
	 *
	 * @param {string} arg0_file_path - The filepath to convert to .ndjson.
	 * @param {Object} [arg1_options]
	 *  @param {number} [arg1_options.ram_threshold=0.50] - Percentage of RAM dedicated to loading NDJSON when running.
	 *  @param {number} [arg1_options.dynamic_chunk_size=67108864] - The size of each chunk of NDJSON to load into memory at init.
	 *  @param {number} [arg1_options.dynamic_max_workers=os.cpus().length - 1] - The maximum number of workers to spawn at init.
	 *
	 * @returns {Promise<void>}
	 */
	ve.NDJSON_parse = async function (arg0_file_path, arg1_options) {
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
			
			let available_buffer = (heap_limit*options.ram_threshold) - memory_usage; //50% of RAM heap by default
			
			//If we are exceeding n% of --max-old-space-size, throttle down
			if (available_buffer < 0) {
				_dynamic_chunk_size = Math.max(1024*1024, _dynamic_chunk_size*0.9); //Floor at 1MB; throttle down by 10%
				_dynamic_max_workers = Math.max(1, _dynamic_max_workers - 1);
			} else {
				//If we have plenty of room, scale back up to CPU limits
				_dynamic_chunk_size = Math.min(128*1024*1024, Math.floor(available_buffer*options.ram_threshold));
				_dynamic_max_workers = Math.min(os.cpus().length - 1, _dynamic_max_workers + 1);
			}
		};
		
		//Return statement
		return new Promise((resolve, reject) => {
			let processNextChunk = () => {
				if (current_offset >= stats.size) {
					if (active_workers === 0) {
						write_stream.end();
						resolve(`${file_path}.ndjson`);
					}
					return;
				}
				
				//Re-evaluate RAM ceiling before spawning
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
						
						if (!can_write) {
							write_stream.once("drain", continueProcessing);
						} else {
							setImmediate(continueProcessing);
						}
					});
					worker.on("error", reject);
					
					//Try to saturate the updated _dynamic_max_workeers
					if (active_workers < _dynamic_max_workers) processNextChunk();
				}
			};
			
			processNextChunk(); //Initialise next chunk processing
		});
	};
	
	/**
	 * @param {string} arg0_file_path
	 * @param {Object} [arg1_options]
	 *  @param {number} [arg1_options.max_ram=8192] - The amount of RAM to dedicate to diffing/querying the .NDJSON file.
	 * 
	 * @returns {Promise<FlatArray>}
	 */
	ve.NDJSON_query = async function (arg0_file_path, arg1_options) {
		let file_path = path.resolve(arg0_file_path);
		let options = (arg1_options) ? arg1_options : {};
		
		// Ensure indexed
		await ve.NDJSON_checkIndex(file_path, options);
		
		let pool = ve.NDJSON_getWorkerPool();
		let promises = [];
		
		for (let i = 0; i < pool.length; i++) {
			let task_id = ve.ndjson_task_id_counter++;
			promises.push(new Promise((resolve) => {
				ve.ndjson_pending_tasks.set(task_id, resolve);
				pool[i].postMessage({
					type: "diff_all",
					task_id,
					file_path,
					timestamp: options.timestamp
				});
			}));
		}
		
		let parts = await Promise.all(promises);
		return parts.flat();
	};
	
	//WRITE OPERATIONS
	
	/**
	 * Updates multiple values and/or appends new ones in a single file pass.
	 *
	 * @param {string} arg0_file_path
	 * @param {Object} arg1_update_map - { id: value, id: value, ... }
	 * @param {Object} [arg2_options]
	 */
	ve.NDJSON_setValues = async function (arg0_file_path, arg1_update_map, arg2_options) {
		let file_path = path.resolve(arg0_file_path);
		let update_map = (arg1_update_map) ? arg1_update_map : {};
		let options = (arg2_options) ? arg2_options : {};
		
		await ve.NDJSON_checkIndex(file_path, options);
		
		let pool = ve.NDJSON_getWorkerPool();
		let temp_path = `${file_path}.tmp`;
		let write_stream = fs.createWriteStream(temp_path);
		let processed_ids = new Set();
		let is_first_entry = true;
		
		write_stream.write("{\n");
		
		for (let i = 0; i < pool.length; i++) {
			let task_id = ve.ndjson_task_id_counter++;
			let worker_results = await new Promise((resolve) => {
				ve.ndjson_pending_tasks.set(task_id, resolve);
				pool[i].postMessage({
					type: "batch_process",
					task_id: task_id,
					file_path: file_path,
					update_map: update_map
				});
			});
			
			if (worker_results)
				for (let x = 0; x < worker_results.length; x++) {
					let local_obj = worker_results[x];
					processed_ids.add(local_obj.id);
					
					let prefix = (is_first_entry) ? "" : ",\n";
					write_stream.write(`${prefix}"${local_obj.id}":${JSON.stringify(local_obj.data)}`);
					is_first_entry = false;
				}
		}
		
		let update_keys = Object.keys(update_map);
		for (let i = 0; i < update_keys.length; i++) {
			let local_id = update_keys[i];
			if (!processed_ids.has(local_id))
				if (update_map[local_id] !== null) {
					let prefix = (is_first_entry) ? "" : ",\n";
					write_stream.write(`${prefix}"${local_id}":${JSON.stringify(update_map[local_id])}`);
					is_first_entry = false;
				}
		}
		
		write_stream.write("\n}");
		await new Promise(resolve => write_stream.end(resolve));
		
		await fs.promises.rename(temp_path, file_path);
		let stats = await fs.promises.stat(file_path);
		ve.ndjson_file_metadata[file_path] = stats.mtimeMs;
	};
	
	//Redefine setValue and removeValue to use the efficient batch process
	ve.NDJSON_setValue = async function (arg0_file_path, arg1_id, arg2_value) {
		let update_map = {};
		update_map[arg1_id] = arg2_value;
		return await ve.NDJSON_setValues(arg0_file_path, update_map);
	};
	
	ve.NDJSON_removeValue = async function (arg0_file_path, arg1_id) {
		let update_map = {};
		update_map[arg1_id] = null; //Signifies deletion
		return await ve.NDJSON_setValues(arg0_file_path, update_map);
	};
}

module.exports = { 
	initialiseIPC: ve.initialiseIPC,
	loadNDJSON: ve.loadNDJSON,
	
	NDJSON_checkIndex: ve.NDJSON_checkIndex,
	NDJSON_diff: ve.NDJSON_diff,
	NDJSON_diffAll: ve.NDJSON_diffAll,
	NDJSON_getValue: ve.NDJSON_getValue,
	NDJSON_getWorkerPool: ve.NDJSON_getWorkerPool,
	NDJSON_index: ve.NDJSON_index,
	NDJSON_parse: ve.NDJSON_parse,
	NDJSON_query: ve.NDJSON_query,
	NDJSON_removeValue: ve.NDJSON_removeValue,
	NDJSON_setValue: ve.NDJSON_setValue,
	NDJSON_setValues: ve.NDJSON_setValues
};