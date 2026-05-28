if (!global?.proc) global.proc = {};

//Initialise functions
{
	proc.send = async function (arg0_json) {
		//Convert from parameters
		let json = (arg0_json) ? arg0_json : {};
		
		//Return statement
		return await Blacktraffic.task("process", {
			args: ["IPC_task", json]
		});
	};
}