if (!global.naissance) global.naissance = {};

naissance.Renderer = class {
	static async draw () {
		//Declare local instance variables
		let diff_all = await db.diffAll(main.timestamp);
		
		console.log(`Diff all:`, diff_all);
		
		//Iterate over all diffs and set cached values
		for (let i = 0; i < diff_all.length; i++) {
			let local_class_name = diff_all[i].class_name;
			let local_key = diff_all[i].key;
			
			//Internal guard clause to ensure a valid draw
			if (!naissance[local_class_name]) {
				console.warn(`Class name "${local_class_name}" not supported. Value:`, diff_all[i]);
				continue;
			}
			if (!naissance.Entity.instances[local_key])
				new naissance[local_class_name](local_key, diff_all[i].value);
			
			//Draw entity
			let local_entity = naissance.Entity.instances[local_key];
				if (local_class_name.startsWith("Geometry"))
					local_entity.value = diff_all[i].value; //Keyframe handling for geometries only
				if (typeof local_entity.draw === "function") await local_entity.draw();
		}
		
		//Update hierarchy
		await main.interfaces.leftbar.hierarchy.refresh();
	}
	
	static async setDate (arg0_date) {
		//Convert from parameters
		let date_obj = arg0_date;
		
		//Declare local instance variables
		let date_interface = main.interfaces.date;
		
		//Set date
		main.date = Date.convertTimestampToDate(date_obj);
		main.timestamp = Date.getTimestamp(date_obj);
		date_interface.date.v = main.date;
		
		//Draw call
		await naissance.Renderer.draw();
	}
};