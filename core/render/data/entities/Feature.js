if (!global.naissance) global.naissance = {};
naissance.Feature = class extends naissance.Entity {
	constructor (arg0_id, arg1_value) {
		super(arg0_id, arg1_value);
		this.class_name = "Feature";
		
		//Destructure value
		Object.iterate(this.value, (local_key, local_value) => {
			this[local_key] = local_value;
		});
		delete this.value;
	}
	
	getGeometries (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Declare local instance variables
		let all_entities = (options.entities) ? options.entities : this.getEntities();
		let all_geometries = [];
		
		//Filter all_entities
		for (let i = 0; i < all_entities.length; i++)
			if (all_entities[i].class_name.startsWith("Geometry"))
				all_geometries.push((!options.return_keys) ? all_entities[i] : all_entities[i].id);
		
		//Return statement
		return all_geometries;
	}
	
	getEntities (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
 				
		if (!Array.isArray(this.entities)) return []; //Internal guard clause if Feature does not have this.entities
		
		//Declare local instance variables
		let all_entities = [...this.entities];
		
		//Iterate over all_entities and recursively fetch .getEntities()
		for (let i = 0; i < all_entities.length; i++) {
			if (!all_entities[i].class_name.startsWith("Feature")) continue;
			
			let local_feature = naissance.Entity.instances[all_entities[i].id];
			
			if (local_feature) {
				all_entities = all_entities.concat(local_feature.getEntities());
			}
		}
		
		//options.return_keys handling
		if (options.return_keys)
			for (let i = 0; i < all_entities.length; i++)
				all_entities[i] = all_entities[i].id;
		
		//Return statement
		return all_entities;
	}
	
	getFeatures (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Declare local instance variables
		let all_entities = (options.entities) ? options.entities : this.getEntities();
		let all_features = [];
		
		//Filter all_entities
		for (let i = 0; i < all_entities.length; i++)
			if (all_entities[i].class_name.startsWith("Feature"))
				all_features.push((!options.return_keys) ? all_entities[i] : all_entities[i].id);
		
		//Return statement
		return all_features;
	}
};