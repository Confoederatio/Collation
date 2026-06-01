//Import libraries
global.electron = require("electron");
let { parentPort, workerData } = require("node:worker_threads");

//Declare variables
let processing = false;
let queue = [];
let is_ready = false;

//Require Vercengen startup
require("../../../core/db/db.js");
require("../../../UF/js/vercengen/startup/vercengen_startup.js");

//Create an initialisation function to track state
async function initialiseWorker() {
	ve.start({
		is_browser: false,
		is_node: true,
		load_files: ["core/process/actions_thread/"]
	});
	
	await db.initialise();
	is_ready = true;
	
	//If tasks arrived during initialisation, start processing them now
	if (queue.length > 0 && !processing)
		processQueue();
}

initialiseWorker();

parentPort.on("message", (task) => {
	if (task.type === "worker_ipc_ready") return; //Guard clause for IPC-pass requests
	
	//Bypasses resource-intensive wait queues for real-time diagnostics
	if (task.type === "get_diagnostics") {
		let memory = process.memoryUsage();
		let v8_stats = require("node:v8").getHeapStatistics();
		
		return parentPort.postMessage({
			task_id: task.task_id,
			results: {
				worker_id: workerData.worker_id,
				rss: memory.rss,
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
	// Only start processing if the worker logic is actually loaded
	if (!processing && is_ready) {
		processQueue();
	}
});

async function handleTask (arg0_json) {
	//Convert from parameters
	let json = arg0_json;
	
	//Internal guard clause if no json.type is provided
	let task_id = json.task_id;
	//console.log(`Sent:`, json);
	if (json.type === undefined) {
		console.error(`Requires a type to send JSON packet onto proc[json.type](json) for processing.`);
		return;
	}
	
	try {
		//Return statement
		if (proc[json.type] === undefined)
			console.error(`json.type: ${json.type} was used, but is not a valid proc type.`);
		return parentPort.postMessage({ task_id, results: await proc[json.type](json.value)});
	} catch (e) {
		console.error(`Error processing task ${task_id}:`, e);
		return parentPort.postMessage({ task_id, error: e.message });
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