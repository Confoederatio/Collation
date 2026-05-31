global.UI_LeftbarHierarchy = class extends ve.Class {
	constructor () {
		super();
		
		this.value = new ve.HTML("Loading ..", {
			attributes: {
				"naissance-ui": "LeftbarHierarchy",
				style: { padding: 0 }
			}
		});
	}
	
	static async draw () {
		//Declare local instance variables
		let hierarchy_obj = {};
		
		//Iterate over all base Entities and draw them
		let all_hierarchy_keys = Object.keys(main.cache.hierarchy);
		
		for (let i = 0; i < all_hierarchy_keys.length; i++) {
			let local_key = all_hierarchy_keys[i];
			
			let local_entity = naissance.Entity.instances[local_key];
			if (local_entity && local_entity.isBaseEntity())
				hierarchy_obj[local_key] = await local_entity.drawHierarchyDatatype();
		}
		
		//Return current_hierarchy, since it is being manually moved out in UI_Leftbar
		let current_hierarchy = new ve.Hierarchy({
			...hierarchy_obj
		});
		
		//Return statement
		return current_hierarchy;
	}
	
	async refresh () {
		//Declare local instance variables
		await UI_LeftbarHierarchy.updateCache();
		console.time(`UI_LeftbarHierarchy.refresh`);
		let current_hierarchy = await UI_LeftbarHierarchy.draw();
		console.timeEnd(`UI_LeftbarHierarchy.refresh`);
		
		console.time(`UI_LeftbarHierarchy.refresh - paint`);
		//Append element as needed
		this.value.element.innerHTML = "";
		this.value.element.appendChild(current_hierarchy.element);
		console.timeEnd(`UI_LeftbarHierarchy.refresh - paint`);
	}
	
	static async updateCache () {
		let all_hierarchy_values = await db.getHierarchyValues(main.timestamp);
		let cache_obj = {};
		
		//Iterate over all_hierarchy_values
		for (let i = 0; i < all_hierarchy_values.length; i++) {
			let local_key = all_hierarchy_values[i].key;
			
			cache_obj[local_key] = all_hierarchy_values[i];
		}
		main.cache.hierarchy = cache_obj;
		
		//is_base_entity: boolean
		Object.iterate(main.cache.hierarchy, (local_key, local_entity) => {
			if (local_entity.class_name && local_entity.class_name.startsWith("Feature"))
				if (local_entity?.value?.entities)
					for (let i = 0; i < local_entity.value.entities.length; i++) {
						let local_cache = main.cache.hierarchy[local_entity.value.entities[i].id];
						
						local_cache.is_base_entity = false;
					}
		});
	}
};