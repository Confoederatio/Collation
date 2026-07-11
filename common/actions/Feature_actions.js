config.actions.feature = {
	delete_feature: {
		name: "Delete Feature",
		scope: ["Feature"],
		
		special_function: async function (json) {
			if (json.delete_feature === true)
				json.naissance_obj.remove();
		}
	},
	feature_operation: {
		name: "Feature Operation",
		scope: ["Feature"],
		
		special_function: async function (json) {
			if (json.feature_operation) {
				naissance.Feature.operate.call(json.naissance_obj,
					json.feature_operation.type,
					(json.feature_operation.feature_id) ? json.feature_operation.feature_id : json.feature_operation.geometry_id);
				UI_Leftbar.refresh();
			}
		}
	},
	import_file: {
		name: "Import File",
		scope: ["Feature"],
		
		special_function: async function (json) {
			if (json.naissance_obj.entities) {
				naissance.Feature.importFile.call(json.naissance_obj, 
					json.import_file.file_path, json.import_file.type, json.import_file.options);
				UI_Leftbar.refresh();
			}
		}
	},
	set_name: {
		name: "Set Name",
		scope: ["Feature"],
		
		special_function: async function (json) {
			if (typeof json.set_name === "string")
				json.naissance_obj._name = json.set_name;
		}
	},
	set_visibility: {
		name: "Set Visibility",
		scope: ["Feature"],
		
		special_function: async function (json) {
			if (json.set_visibility === true) {
				json.naissance_obj.show();
			} else if (json.set_visibility === false) {
				json.naissance_obj.hide();
			}
		}
	},
};