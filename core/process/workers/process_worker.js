//Import libraries
let { parentPort, workerData } = require("node:worker_threads");

//Declare variables
let processing = false;
let queue = [];

//Require Vercengen startup
require("../../../UF/js/vercengen/startup/vercengen_startup.js");
ve.start({
	is_browser: false, is_node: true,
	load_files: [
		"core/process/actions_thread/"
	]
});

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
})

async function handleTask (arg0_json) {
	//Convert from parameters
	let json = arg0_json;
	
	//Internal guard clause if no json.type is provided
	let task_id = json.task_id;
	if (json.type === undefined) {
		console.error(`Requires a type to send JSON packet onto proc[json.type](json) for processing.`);
		return;
	}
	
	try {
		//Return statement
		return parentPort.postMessage({ task_id, results: await proc[json.type](json.value)});
	} catch (error) {
		console.error(`Error processing task ${task_id}:`, error);
		return parentPort.postMessage({ task_id, error: error.message });
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