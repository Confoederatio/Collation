if (!global?.naissance) global.naissance = {};

//State mutation functions
{
	DALS.Timeline.parseAction = function (arg0_json, arg1_do_not_push_action) {
		//Convert from parameters
		let json = (typeof arg0_json === "string") ? JSON.parse(arg0_json) : arg0_json;
		let do_not_push_action = arg1_do_not_push_action;
	};
}

//State save/load functions
{
	
	DALS.Timeline.loadState = function (arg0_json) {
		//Convert from parameters
		let json = (arg0_json) ? arg0_json : {};
		if (typeof json === "string") json = JSON.parse(json);
		
		//0. Clear map
		console.log(`DALS.Timeline.loadState called.`);
		
		//Reload cursor
		main.layers.cursor_layer.addGeometry(main.brush.cursor);
	};
	
	DALS.Timeline.saveState = function () {
		//Declare local instance variables
		let json_obj = {};
		
		//Return statement
		return json_obj;
	};
	
	naissance.loadSave = async function (arg0_file_path) {
		//Convert from parameters
		let file_path = path.resolve(arg0_file_path);
		
		//Declare local instance variables //[WIP] - This needs to be a function pattern
		let data = fs.readFileSync(file_path, "utf8");
		
		//Load save, then 
		await Blacktraffic.task("ndjson:load", {
			args: [file_path]
		});
		main.file_path = `${file_path}.ndjson`;
		DALS.Timeline.loadState(data);
	};
}