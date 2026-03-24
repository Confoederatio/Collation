//Initialise functions
{
	DALS.Timeline.loadState = function (arg0_json) {
		console.error(`DALS.Timeline.loadState(arg0_json) has not been manually overridden by the program!`);
	};
	DALS.Timeline.parseAction = function (arg0_json) {
		//Convert from parameters
		let json = (typeof arg0_json === "string") ? JSON.parse(arg0_json) : arg0_json;
		
		//Initialise JSON
		if (json.options === undefined) json.options = {};
		if (json.value === undefined) json.value = [];
		
		//Iterate over multi-value packet (MVP) and filter it down to superclass single-value packets (SVPs)
		for (let i = 0; i < json.value.length; i++) try {
			if (json.value[i].type === "global") {
				if (json.value[i].load_save)
					DALS.Timeline.loadState(json.value[i].load_save);
			}
		} catch (e) { console.error(e); }
		console.error(`DALS.Timeline.parseAction(arg0_json) does not have a parser bound to it.`);
	};
	DALS.Timeline.saveState = function () {
		console.error(`DALS.Timeline.saveState() has not been manuially overridden by the program! Returning an empty object.\n- If you are seeing this for the first time, it is likely because of state initialisation.`);
		
		//Return statement
		return {};
	};
}
