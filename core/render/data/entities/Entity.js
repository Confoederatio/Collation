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
		
		//Declare local instance variables
		let static_obj = naissance[cache_obj.class_name];
		
		let hierarchy_symbol = (static_obj.hierarchy_symbol) ?
			static_obj.hierarchy_symbol : {};
		
		//Return statement
		if (!cache_obj) return;
		if (!cache_obj.class_name) return;
		if (cache_obj.class_name.startsWith("Geometry")) {
			if (!main.cache.hierarchy_components) main.cache.hierarchy_components = {};
			let hierarchy_components = main.cache.hierarchy_components;
			
			if (hierarchy_components[cache_obj.key] === undefined)
				hierarchy_components[cache_obj.key] = veHierarchyDatatype({
					...naissance.Entity.drawHierarchyDatatypeGenerics(cache_obj),
				}, {
					id: cache_obj.key,
					name: cache_obj.name
				});
			let component_obj = main.cache.hierarchy_components[cache_obj.key];
			
			//Update .icon symbol if possible
			try {
				let icon_el = component_obj.components_obj.icon.element;
				
				if (hierarchy_symbol.fill_colour)
					icon_el.style.color = cache_obj?.current_keyframe?.[1]?.polygonFill;
			} catch (e) {}
			
			//Return statement
			return component_obj;
		}
	}
	
	static drawHierarchyDatatypeGenerics (arg0_cache_obj) {
		//Convert from parameters
		let cache_obj = (arg0_cache_obj) ? arg0_cache_obj : {};
		
		//Declare local instance variables
		let static_obj = naissance[cache_obj.class_name];
		
		//Parse hierarchy_symbol
		let hierarchy_symbol = (static_obj.hierarchy_symbol) ?
			static_obj.hierarchy_symbol : {};
		let hierarchy_symbol_components = {};
		
		if (hierarchy_symbol.icon)
			hierarchy_symbol_components.icon = veHTML(`<icon>${hierarchy_symbol.icon}</icon>`);
		
		//Return statement
		return {
			selected: veCheckbox(undefined),
			...hierarchy_symbol_components,
			context_menu: veButton(() => {
				console.log(`Debug cache_obj::`, cache_obj);
			}, {
				attributes: { "data-type": "context-menu" },
				name: "<icon>more_vert</icon>",
			})
		}
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