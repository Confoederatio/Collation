//Import libraries
let NodeWorker = require("node:worker_threads").Worker;
let os = require("node:os");

require("../../../UF/js/vercengen/db_shared/NDJSON_history"); //Require NDJSON_history.js

if (!global?.proc)
	/*
	 * The namespace for all process-related functions.
	 * 
	 * @namespace proc
	 */
	global.proc = {};

//Initialise functions
{
	/**
	 * Resolves active RAM diagnostic percentage statistics from every worker in the pool.
	 * IPC: `process:get-diagnostics` | Callback: `process:get-diagnostics-ready`.
	 *
	 * @returns {Promise<Array<{worker_id: number, rss: number, heapUsed: number, heapTotal: number, heapLimit: number, percentage: number}>>}
	 */
	proc.IPC_getDiagnostics = async function () {
		//Declare local instance variables
		let pool = proc.IPC_getWorkerPool();
		let promises = [];
		
		for (let i = 0; i < pool.length; i++) {
			let task_id = proc.task_id_counter++;
			
			promises.push(new Promise((resolve) => {
				proc.pending_tasks.set(task_id, resolve);
				pool[i].postMessage({
					type: "get_diagnostics",
					task_id: task_id
				});
			}));
		}
		
		//Return statement
		return await Promise.all(promises);
	};
	
	/**
	 * Creates a pool of workers to handle geoprocessing tasks.
	 * IPC: `process:get-worker-pool` | Callback: `process:get-worker-pool-ready`.
	 *
	 * @param {number} [arg0_max_workers=Math.ceil((os.cpus().length - 1)/8)]
	 *
	 * @returns {NodeWorker[]}
	 */
	proc.IPC_getWorkerPool = function (arg0_max_workers) {
		//Convert from parameters
		let max_workers = Math.returnSafeNumber(
			arg0_max_workers,
			Math.ceil((os.cpus().length - 1) / 8)
		);
		
		//Init worker pool variables
		if (proc.pending_tasks === undefined) proc.pending_tasks = new Map();
		if (proc.task_id_counter === undefined) proc.task_id_counter = 0;
		if (proc.worker_pool === undefined) proc.worker_pool = [];
		
		//Declare local instance variables
		if (proc.worker_pool.length === 0) {
			let { ipcMain } = require("electron");
			
			for (let i = 0; i < max_workers; i++) {
				let worker = new NodeWorker("./core/process/workers/process_worker.js", {
					workerData: { worker_id: i },
				});
				
				worker.on("message", (response) => {
					//1. Handle proxy/bridge requests (When the worker calls Blacktraffic.task)
					if (response.type === "worker_ipc_request") {
						let { channel, args, task_id } = response;
						
						//Create a mock event that mimics an IPC call from a renderer
						let mock_event = {
							sender: {
								send: (response_channel, results) => {
									//Forward the response back to the worker
									worker.postMessage({
										type: "worker_ipc_ready",
										task_id: task_id,
										results: results,
									});
								},
							},
						};
						
						//Emitting the event triggers the handlers defined in ve.initialiseIPC()
						ipcMain.emit(channel, mock_event, ...args);
						return;
					}
					
					//2. Handle standard task/diagnostic responses
					let callback = proc.pending_tasks.get(response.task_id);
					if (callback) {
						callback(response.results !== undefined ? response.results : true);
						proc.pending_tasks.delete(response.task_id);
					}
				});
				
				proc.worker_pool.push(worker);
			}
		}
		
		//Return statement
		return proc.worker_pool;
	};
	
	/**
	 * Sends an IPC task down to subordinate workers deemed available.
	 * 
	 * @param {Object} arg0_json
	 * @constructor
	 */
	proc.IPC_task = async function (arg0_json) {
		//Convert from parameters
		let json = (arg0_json) ? arg0_json : {};
		
		//Declare local instance variables
		let pool = proc.IPC_getWorkerPool();
		let selected_worker = pool[0];
		
		let min_tasks = (selected_worker.active_tasks || 0);
		
		//Iterate over all workers in pool to see which is doing the least work
		for (let i = 1; i < pool.length; i++) {
			let active_tasks = (pool[i].active_tasks || 0);
			
			if (active_tasks < min_tasks) {
				min_tasks = active_tasks;
				selected_worker = pool[i];
			}
		}
		
		//Increment the task counter for this worker
		if (selected_worker.active_tasks === undefined)
			selected_worker.active_tasks = 0;
		selected_worker.active_tasks++;
		
		//Create performance container task ID
		let task_id = proc.task_id_counter++;
		
		//Return statement
		return new Promise((resolve) => {
			//Intersect callback to decrement worker task overhead
			proc.pending_tasks.set(task_id, (result) => {
				selected_worker.active_tasks--;
				resolve(result);
			});
			selected_worker.postMessage({
				type: json.type,
				task_id: task_id,
				
				value: json
			});
		})
	};
}