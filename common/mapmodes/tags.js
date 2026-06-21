config.mapmodes.tags = {
	name: "Tags",
	icon: "label",
	description: "Custom viewer for different tags and tag groups.",
	
	getSymbolEditor: () => {
		
	},
	
	onshow: (v) => {
		//Declare local instance variables
		let config_obj = config.mapmodes.tags;
		let map_settings = main.map.settings;
		
		if (!map_settings.tag_mapmode) map_settings.tag_mapmode = {};
		if (main.interfaces.tag_mapmode) main.interfaces.tag_mapmode.close();
		
		//Declare UI variables
		let template_select_obj = {};
			Object.iterate(map_settings.tag_mapmode, (local_key, local_value) =>
				template_select_obj[local_key] = (local_value.name || local_key));
			
		let symbol_editor = veList(veRawInterface({
			tags: veText([""], { name: "Tags" }),
			fill_colour: veColour("#ffffff", { is_rgba: true })
		}, {
			style: {
				alignItems: "center",
				display: "flex"
			}
		}), { name: "Edit Symbols" });
		
		//Open window
		main.interfaces.tag_mapmode = veWindow({
			switch_template: veSelect({
				none: { name: "None" },
				...template_select_obj
			}, {
				name: "Switch Template",
				onuserchange: (v) => map_settings.tag_mapmode_selected = v,
				selected: (map_settings.tag_mapmode_selected) ? map_settings.tag_mapmode_selected : "none"
			}),
			template_name: veText(config_obj.template_name, { 
				name: "Template Name",
				onuserchange: (v) => config_obj.template_name = v
			}),
			symbol_editor,
			update_mapmode: veButton(() => {
				let symbol_array = [];
				let symbol_editor_values =  symbol_editor.v;
				
				//Iterate over all symbol_editor_values; populate symbol_array
				for (let i = 0; i < symbol_editor_values.length; i++)
					symbol_array.push([symbol_editor_values[i].tags.v, {
						polygonFill: symbol_editor_values[i].fill_colour.getHex(),
						polygonOpacity: 1 //Extend range since this is RGBA
					}]);
				
				//Update symbol_function
				config_obj.symbol_array = symbol_array;
				
				//Update map_settings.tag_mapmode
				if (config_obj.template_name) {
					map_settings.tag_mapmode[config_obj.template_name] = {
						name: config_obj.template_name,
						symbol_array
					};
					veToast(`Saved tag mapmode as ${config_obj.template_name}.`);
				}
			}, { name: "Update Mapmode" })
		}, {
			name: "Tag Mapmode",
			width: "30rem"
		});
	},
	symbol_function: (geometry_obj) => {
		//Declare local instance variables
		let local_tags = (geometry_obj?.metadata?.tags) ? geometry_obj.metadata.tags : [];
		let symbol_array = (config.mapmodes.tags.symbol_array || []);
		let symbol_obj = {};
		
		//Iterate over symbol_array and parse it
		for (let i = 0; i < symbol_array.length; i++) {
			//Check if symbol_array[i][0] contains local_tags
			let has_local_tag = false;
			
			for (let x = 0; x < local_tags.length; x++)
				if (symbol_array[i][0].includes(local_tags[x])) {
					has_local_tag = true;
					break;
				}
			
			//Apply symbol if has_local_tag
			if (has_local_tag)
				symbol_obj = { ...symbol_obj, ...symbol_array[i][1] };
		}
		
		//Return statement
		return symbol_obj;
	}
};