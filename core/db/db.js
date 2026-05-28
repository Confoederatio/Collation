if (!global.db) global.db = {};

//Initialise functions
{
	/**
	 * Initialises the DB API for Naissance.
	 * 
	 * @returns {Promise<boolean>}
	 */
	db.initialise = async function () {
		//Declare local instance variables
		let all_function_keys = await Blacktraffic.task("ndjson:get-all-functions");
		
		for (let i = 0; i < all_function_keys.length; i++)
			db[all_function_keys[i]] = async function (...argn_arguments) {
				//Return statement
				return await db.send(all_function_keys[i], ...argn_arguments);
			};
		
		//Return statement
		return true;
	};
	
	/**
	 * Internal helper method. Sends a command to DB threads by calling an NDJSON function.
	 * 
	 * @param {string} arg0_function_key
	 * @param {any[]} argn_arguments
	 * @returns {Promise<*>}
	 */
	db.send = async function (arg0_function_key, ...argn_arguments) {
		//Convert from parameters
		let function_key = arg0_function_key;
		
		//Return statement
		return await Blacktraffic.task("ndjson", {
			args: [function_key, ...argn_arguments]
		});
	};
}