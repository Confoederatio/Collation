if (!global.naissance) global.naissance = {};

/**
 * @param {string} arg0_key
 * @param {Object} [arg1_json]
 *  @param {string} [arg1_json.name]
 *  
 *  @param {boolean} [arg1_json.do_not_bind_to_feature=false]
 *  @param {function} [arg1_json.draw_function] - (arg0_naissance_obj.ui:{@link Object})
 *  @param {Object} [arg1_json.node_options]
 *  @param {string|string[]} [arg1_json.scope]
 *  @param {AsyncFunction} [arg1_json.special_function] - (arg0_json:{@link Object}) 
 * 
 * @type {naissance.Action}
 */
naissance.Action = class {
	static instances = {};
	static scope_map = {};
	
	constructor (arg0_key, arg1_json) {
		//Convert from parameters
		let key = arg0_key;
		let json = (arg1_json) ? arg1_json : {};
		
		//Initialise options
		if (json.do_not_bind_to_feature === undefined) json.do_not_bind_to_feature = false;
		
		//Declare local instance variables
		this.key = key.split("-")[1];
		
		//1. Destructure json
		Object.iterate(json, (local_key, local_value) => this[local_key] = local_value);
		
		//2. Add to scope_map
		let scope_map = naissance.Action.scope_map;
		
		if (this.scope) {
			this.scope = Array.toArray(this.scope);
			
			for (let i = 0; i < this.scope.length; i++) {
				if (!scope_map[this.scope[i]]) scope_map[this.scope[i]] = {};
				scope_map[this.scope[i]][this.key] = this;
			}
		}
		
		//Push to naissance.Action.instances
		naissance.Action.instances[key] = this;
	}
	
	/**
	 * Returns the Actions Palette for a given Naissance Entity.
	 * 
	 * @param {Object} arg0_naissance_obj
	 * 
	 * @returns {ve.Interface}
	 */
	static drawActionsPalette (arg0_naissance_obj) {
		//Declare local instance variables
		let naissance_obj = arg0_naissance_obj;
		
		//Declare local instance variables
		let components_obj = {};
		let scopes = [];
		
		if (naissance_obj.class_name) {
			if (naissance_obj.class_name.startsWith("Feature"))
				scopes.push("Entity", "Feature");
			if (naissance_obj.class_name.startsWith("Geometry"))
				scopes.push("Entity", "Geometry");
			scopes.push(naissance_obj.class_name);
		}
		
		//Iterate over all scopes and the .scope_map[scopes[i]] that applies to it
		for (let i = 0; i < scopes.length; i++) {
			let local_map = naissance.Action.scope_map[scopes[i]];
			
			if (!local_map) continue;
			
			//Iterate over local_map and structure buttons with .draw_function bound to them; assuming they have one
			Object.iterate(local_map, (local_key, local_action) => {
				if (typeof local_action.draw_function === "function") {
					let action_name = (local_action.name || local_action.key);
					
					components_obj[local_action.key] = veButton(() => {
						let local_name = (naissance_obj.name || naissance_obj.class_name);
						
						if (naissance_obj[`${local_key}_window`]) naissance_obj[`${local_key}_window`].close();
						naissance_obj[`${local_key}_window`] = veWindow(local_action.draw_function.call(naissance_obj), {
							name: `${action_name}${(local_name) ? ` (${local_name})` : ""}`,
							can_rename: false,
							width: "20rem",
							...local_action.window_options
						});
					}, { name: action_name });
				}
			});
		}
		
		//Show either veHTML/veSearchSelect depending on relevance
		let processed_components_obj = {};
		
		if (Object.keys(components_obj).length > 0) {
			processed_components_obj.actions_palette = veSearchSelect(components_obj, {
				display: "inline",
				placeholder: "Search for action ...",
				style: {
					"> [component='ve-button']": {
						display: "inline",
						padding: 0
					}
				}
			});
		} else {
			processed_components_obj.actions_palette = veHTML("No actions available.");
		}
		
		//Return statement
		return veInterface({
			name: "Actions",
			style: { padding: 0 },
			width: 99
		});
	}
	
	/**
	 * Initialises everything from `config.actions` into `naissance.Action.instances` as a structured map.
	 */
	static initialise () { //[WIP] - Finish function body
		//Iterate over all config.actions categories and their subobjects
		Object.iterate(config.actions, (local_category_key, local_category_obj) => {
			Object.iterate(local_category_obj, (local_action_key, local_action_obj) => {
				new naissance.Action(`${local_category_key}-${local_action_key}`, local_action_obj);
			});
		});
	}
};