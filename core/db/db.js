if (!global.db) global.db = {};

//Initialise functions
{
	db.send = async function (arg0_function_key, ...argn_arguments) {
		//Convert from parameters
		let function_key = arg0_function_key;
		
		//Return statement
		return await Blacktraffic.task("ndjson", {
			args: [function_key, ...argn_arguments]
		});
	};
}