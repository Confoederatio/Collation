//Import libraries
let NodeWorker = require("node:worker_threads").Worker;

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