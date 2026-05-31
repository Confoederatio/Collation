if (!global.naissance) global.naissance = {};
naissance.Entity = class extends ve.Class {
	static instances = {};
	
	constructor (arg0_id, arg1_value) {
		//Convert from parameters
		let id = arg0_id;
		let value = arg1_value;
		super();
		
		//Declare local instance variables
		this.class_name = "Entity";
		this.id = id;
		this.value = value;
		
		//Push to naissance.Entity.instances
		naissance.Entity.instances[this.id] = this;
	}
	
	getName () { return "Entity"; }
	
	isBaseEntity () {
		//Return statement
		return (main.cache.hierarchy[this.id].is_base_entity !== false);
	}
	
	static drawHierarchyDatatype (arg0_cache_obj) {
		//Convert from parameters
		let cache_obj = (arg0_cache_obj) ? arg0_cache_obj : {};
		
		//Return statement
		if (!cache_obj) return;
		if (!cache_obj.class_name) return;
		if (cache_obj.class_name.startsWith("Geometry"))
			return veHierarchyDatatype({
				
			}, {
				name: cache_obj.name
			});
	}
	
	static getRetainedObject (arg0_class_name) {
		//Convert from parameters
		let class_name = arg0_class_name;
		
		//Iterate over all Objects, compile rendered Object
		let retained_obj = {};
		
		Object.iterate(naissance.Entity.instances, (local_key, local_value) => {
			if (class_name === undefined || local_value.class_name === class_name)
				retained_obj[local_key] = local_value;
		});
		
		//Return statement
		return retained_obj;
	}
};