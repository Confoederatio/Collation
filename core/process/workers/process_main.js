//Import libraries
let NodeWorker = require("node:worker_threads").Worker;
let os = require("node:os");

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
	 * @param {number} [arg0_max_workers=os.cpus().length - 1]
	 *
	 * @returns {NodeWorker[]}
	 */
	proc.IPC_getWorkerPool = function (arg0_max_workers) {
		//Convert from parameters
		let max_workers = Math.returnSafeNumber(arg0_max_workers, os.cpus().length - 1);
		
		//Init worker pool variables
		if (proc.pending_tasks === undefined) proc.pending_tasks = new Map();
		if (proc.task_id_counter === undefined) proc.task_id_counter = 0;
		if (proc.worker_pool === undefined) proc.worker_pool = [];
		
		//Declare local instance variables
		if (proc.worker_pool.length === 0)
			for (let i = 0; i < max_workers; i++) {
				let worker = new NodeWorker("./core/process/workers/process_worker.js", { workerData: { worker_id: i } });
				worker.on("message", (response) => {
					let callback = proc.pending_tasks.get(response.task_id);
					if (callback) {
						callback((response.results !== undefined) ? response.results : true);
						proc.pending_tasks.delete(response.task_id);
					}
				});
				proc.worker_pool.push(worker);
			}
		
		//Return statement
		return proc.worker_pool;
	};
	
	
}