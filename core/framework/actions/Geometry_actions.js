if (!global.naissance) global.naissance = {};

/**
 * Parses a JSON action for a target Geometry.
 * - Static method of: {@link naissance.Geometry}
 *
 * `arg0_json`: {@link Object}|{@link string}
 * - `.geometry_obj`: {@link Object}|{@link string} - Identifier. The {@link naissance.Geometry} ID to target changes for, if any.
 * <br>
 * - #### Extraneous Commands:
 * - `.clean_keyframes`: {@link Array}<{@link string}> - Arguments: ["symbol"]. Whether to clean keyframes, including the default `main.brush.getBrushSymbol()` (if symbol is enabled), as well as any duplicates.
 * - `.delete_geometry`: {@link boolean}
 * - `.geometry_operation`: {@link Object}
 *   - `.type`: {@link string} - Either 'buffer'/'difference'/'intersect'/'union'/'xor'.
 *   -
 *   - `.feature_id`: {@link string}
 *   - `.geometry_id`: {@link string}
 *   
 *   - Special options ('buffer')
 *     - `.distance`: {@link number} - The number of kilometres to buffer by.
 * - `.merge_geometry`: {@link string} - Merges a geometry with the target geometry ID.
 * - `.move_keyframe`: {@link number}
 *   - `.date`: {@link Object} - The date of the keyframe to move.
 *   - `.ot_date`: {@link Object} - The date to move the keyframe to.
 * - `.remove_keyframe`: {@link number} - The timestamp of the removed keyframe.
 * - `.remove_property`: {@link Object}
 *   - `.date`: {@link number}|{@link Object} - Optional.
 *   - `.key`: {@link string}
 * - `.set_history`: {@link string} - The JSON `.history` string to set for the target Geometry.
 * - `.set_label_symbol`: {@link Object}
 * - `.set_name`: {@link string}
 * - `.set_polygon`: {@link string} - The JSON to set the polygon geometry to.
 * - `.set_properties`: {@link Object}
 *   - `<data_key>`: {@link any}
 * - `.set_tags`: {@link Array}<{@link string}>
 * - `.set_symbol`: {@link Object}
 *   - `<symbol_key>`: {@link any}
 * - `.set_zoom`: {@link Object}
 *   - `.is_start_keyframe=false`: {@link boolean}
 *   - `.max_zoom`: {@link number}|{@link string} - 'delete' if a number.
 *   - `.min_zoom`: {@link number}|{@link string} - 'delete' if a number.
 *   
 * - Variables:
 * - `.add_column`: {@link Object}
 *   - `.key`: {@link string}
 *   - `.values`: {@link Array}<{@link Array}<{@link Object}|{@link number}, {@link any}, ...>> - [date, value] map.
 * - `.add_variable`: {@link Object}
 *   - `.date`: {@link Object}|{@link number}|{@link string} - If string, either 'start'/'end'.
 *   - `.key`: {@link string}
 *   - `.value`: {@link any}
 * - `.remove_column`: {@link string}
 * - `.remove_variable`: {@link Object}
 *   - `.date`: {@link Object}|{@link number}|{@link string} - If string, either 'start'/'end'.
 *   - `.key`: {@link string}
 *
 * @param {Object|string} arg0_json
 */
naissance.Geometry.parseAction = async function (arg0_json) { //[WIP] - Add variable actions
	//Convert from parameters
	let json = (typeof arg0_json === "string") ? JSON.parse(arg0_json) : arg0_json;
	
	//Declare local instance variables
	let geometry_obj = (typeof json.geometry_obj === "string") ? 
		naissance.Geometry.instances[json.geometry_obj] : json.geometry_obj;
	
	//Parse commands for geometry_obj
	if (geometry_obj) {
		//Specialised Geometry handler
		if (geometry_obj.class_name)
			if (["GeometryLine", "GeometryPoint", "GeometryPolygon"].includes(geometry_obj.class_name))
				await naissance[geometry_obj.class_name].parseAction(json);
	}
};