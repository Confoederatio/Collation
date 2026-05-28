if (!global?.proc) global.proc = {};

//Initialise functions
{
	proc.send = async function (arg0_function_key, ...argn_arguments) {
		//Convert from parameters
		let function_key = arg0_function_key;
		
		//Return statement
		return await Blacktraffic.task("process", {
			args: [function_key, ...argn_arguments]
		});
	}
}