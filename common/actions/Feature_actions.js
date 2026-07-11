/**
 * - ##### Internal Commands:
 * - `.add_column`: {@link Object}
 *   - `.key`: {@link string}
 *   - `.values`: {@link Array}<{@link Array}<{@link Object}|{@link number}, {@link any}, ...>> - [date, value] map.
 * - `.add_variable`: {@link Object}
 *   - `.date`: {@link Object}|{@link number}|{@link string} - If string, either 'start'/'end'.
 *   - `.key`: {@link string}
 *   - `.value`: {@link any}
 * - `.clean_keyframes`: {@link Array}<{@link string}> - Cleans geometry keyframes for default symbols, redundant names. Options: ["symbol"]
 * - `.clean_geometry_tags`: {@link boolean}
 * - `.delete_feature`: {@link boolean}
 * - `.feature_operation`: {@link Object}
 *   - `.type`: {@link string} - Either 'difference'/'intersect'/'union'/'xor'.
 *   -
 *   - `.feature_id`: {@link string}
 *   - `.geometry_id`: {@link string}
 * - `.flatten_all_geometries`: {@link boolean}
 * - `.import_file`: {@link Object}
 *   - `.file_path`: {@link string}
 *   - `.type`: {@link string} - Either 'csv'/'geojson'/'gpx'/'kml'/'kmz'/'naissance'/'osm'/'polyline'/'shp'/'topojson'/'wkt'.
 *   - `.options`: {@link Object}
 * - `.move_all_entities_to_feature`: {@link string}
 * - `.set_name`: {@link string}
 * - `.set_visibility`: {@link boolean}
 * - `.set_zoom`: {@link Object}
 *   - `.is_start_keyframe=false`: {@link boolean}
 *   - `.max_zoom`: {@link number}|{@link string} - 'delete' if a number.
 *   - `.min_zoom`: {@link number}|{@link string} - 'delete' if a number.
 * - `.simplify_all_polygons`: {@link number}
 * 
 * @type {Object}
 */
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