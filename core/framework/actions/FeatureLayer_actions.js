/**
 * Parses a JSON action for a target FeatureLayer.
 * - Static method of: {@link naissance.FeatureLayer}
 *
 * arg0_json: {@link Object}|{@link string}
 * - .feature_obj: {@link Object}|{@link string} - Identifier. The {@link naissance.Feature} ID to target changes for.
 * <br>
 * - #### Extraneous Commands:
 *   - .create_layer: {@link Object}
 *     - .do_not_refresh=false: {@link boolean}
 *     - .id: {@link string}
 *   - .merge_layer: {@link Object}
 *     - .do_not_delete_after=false: {@link boolean}
 *     - .end_date: {@link number}|{@link Object}
 *     - .start_date: {@link number}|{@link Object}
 *     - .to_layer_id: {@link string} - The ID of the layer to merge the current layer into.
 * - #### Internal Commands:
 *   - .set_layer_option: {@link Object}
 *     - .key: {@link string} - The key to change for the selected layer.
 *     - .value: {@link any} - What to change the value of the key to.
 */
naissance.FeatureLayer.parseAction = async function (arg0_json) {
	//Convert from parameters
	let json = (typeof arg0_json === "string") ? JSON.parse(arg0_json) : arg0_json;
	
	//Declare local instance variables
	let layer_obj = (typeof json.feature_obj === "string") ?
		naissance.Feature.instances[json.feature_obj] : json.feature_obj;
	
	//Parse extraneous commands
	//create_layer
	if (json.create_layer)
		if (json.create_layer.id) {
			let new_layer = new naissance.FeatureLayer();
			new_layer.setID(json.create_layer.id);
			
			if (!json.create_layer.do_not_refresh)
				UI_LeftbarHierarchy.refresh();
		}
	
	//Parse commands for layer_obj
	if (layer_obj) {
		//merge_layer
		if (json.merge_layer) {
			//Declare local instance variables
			let from_layer_geometries = layer_obj.getAllGeometries();
			let from_layer_json = layer_obj.toJSON();
			let from_layer_timestamps = layer_obj.getTimestamps();
			let to_layer = naissance.Feature.instances[json.merge_layer.to_layer_id];
			let to_layer_geometries = to_layer.getAllGeometries();
			let to_layer_timestamps = to_layer.getTimestamps();
			
			let from_timestamp_set = new Set(from_layer_timestamps);
			let to_timestamp_set = new Set(to_layer_timestamps);
			let all_timestamps = [...new Set([...from_layer_timestamps, ...to_layer_timestamps])]
				.sort((a, b) => a - b);
			
			let end_date = (json.merge_layer.end_date) ?
				Date.getTimestamp(json.merge_layer.end_date) : all_timestamps[all_timestamps.length - 1];
			let start_date = (json.merge_layer.start_date) ?
				Date.getTimestamp(json.merge_layer.start_date) : all_timestamps[0];
			
			//1. Difference Layer A from Layer B to ensure unlinked source polygons have room in to_layer
			let from_layer_union;
			
			for (let i = 0; i < all_timestamps.length; i++) {
				let current_timestamp = all_timestamps[i];
				if (current_timestamp >= start_date && current_timestamp <= end_date) {
					//Update the current union of geometries in the source layer at this timestamp
					//Only recalculate if the source layer actually has a keyframe here
					if (from_timestamp_set.has(current_timestamp)) {
						from_layer_union = undefined;
						
						for (let x = 0; x < from_layer_geometries.length; x++) {
							let local_geometry = from_layer_geometries[x];
							let local_keyframe_val = local_geometry.getGeometryKeyframeAtDate(current_timestamp);
							
							if (local_keyframe_val && local_geometry.class_name === "GeometryPolygon") {
								let maptalks_json = maptalks.Geometry.fromJSON(local_keyframe_val);
								let turf_geometry = Geospatiale.convertMaptalksToTurf(maptalks_json);
								
								from_layer_union = (from_layer_union === undefined) ?
									turf_geometry : turf.union(turf.featureCollection([from_layer_union, turf_geometry]));
							}
						}
					}
					
					//Subtract source union from destination layer if destination has data or source just changed
					if (from_layer_union && (from_timestamp_set.has(current_timestamp) || to_timestamp_set.has(current_timestamp))) {
						for (let x = 0; x < to_layer_geometries.length; x++) {
							let target_geometry = to_layer_geometries[x];
							let target_keyframe_val = target_geometry.getGeometryKeyframeAtDate(current_timestamp);
							
							if (target_keyframe_val && target_geometry.class_name === "GeometryPolygon") {
								let maptalks_target = maptalks.Geometry.fromJSON(target_keyframe_val);
								let turf_target = Geospatiale.convertMaptalksToTurf(maptalks_target);
								
								let differenced_turf = turf.difference(turf.featureCollection([turf_target, from_layer_union]));
								let maptalks_result = Geospatiale.convertTurfToMaptalks(differenced_turf);
								let result_json = (maptalks_result && typeof maptalks_result.toJSON === "function") ?
									maptalks_result.toJSON() : null;
								
								target_geometry.history.addKeyframe(current_timestamp, result_json);
							}
						}
					}
				}
				
				console.log(`1. Differencing`, all_timestamps[i], `(${i}/${all_timestamps.length})`);
			}
			console.log(`1. Finished differencing.`);
			
			//2. Clean target keyframes
			let to_layer_ids = [];
			for (let i = 0; i < to_layer_geometries.length; i++) to_layer_ids.push(to_layer_geometries[i].id);
			naissance.Geometry.parseActionForGeometries(to_layer_ids, {
				command: "clean_keyframes", key: "clean_keyframes", name: "Clean F.Geometry Keyframes", value: []
			});
			console.log(`2. Cleaned target keyframes.`);
			
			//3. Union linked polygons
			for (let i = 0; i < from_layer_geometries.length; i++) {
				let from_geometry = from_layer_geometries[i];
				let linked_id = from_geometry?.metadata?.linked_id;
				if (linked_id) {
					let to_geometry = naissance.Geometry.instances[linked_id];
					if (to_geometry) {
						let from_keys = Object.keys(from_geometry.history.keyframes).map(Number);
						let to_keys = Object.keys(to_geometry.history.keyframes).map(Number);
						let union_timestamps = [...new Set([...from_keys, ...to_keys])].sort((a, b) => a - b);
						
						for (let x = 0; x < union_timestamps.length; x++) {
							let current_timestamp = union_timestamps[x];
							if (current_timestamp < start_date || current_timestamp > end_date) continue;
							
							let from_val = from_geometry.getGeometryKeyframeAtDate(current_timestamp);
							let to_val = to_geometry.getGeometryKeyframeAtDate(current_timestamp);
							let from_turf = (from_val) ? Geospatiale.convertMaptalksToTurf(maptalks.Geometry.fromJSON(from_val)) : undefined;
							let to_turf = (to_val) ? Geospatiale.convertMaptalksToTurf(maptalks.Geometry.fromJSON(to_val)) : undefined;
							
							if (from_turf && to_turf) {
								let turf_union = turf.union(turf.featureCollection([from_turf, to_turf]));
								to_geometry.history.addKeyframe(current_timestamp, Geospatiale.convertTurfToMaptalks(turf_union).toJSON());
							} else if (from_turf || to_turf) {
								to_geometry.history.addKeyframe(current_timestamp, Geospatiale.convertTurfToMaptalks(from_turf || to_turf).toJSON());
							}
							
							let from_keyframe = from_geometry.history.keyframes[current_timestamp];
							if (from_keyframe && from_keyframe.value.length > 1) {
								let extra_values = from_keyframe.value.slice(1);
								to_geometry.history.addKeyframe(current_timestamp, undefined, ...extra_values);
							}
						}
					}
					from_geometry.remove(true);
				}
				
				console.log(`3. Unioning linked polygons`, all_timestamps[i], `(${i}/${all_timestamps.length})`);
			}
			console.log(`3. Finished unioning linked polygons.`);
			
			//4. Clip unlinked entities and prepare for transfer
			for (let i = layer_obj.entities.length - 1; i >= 0; i--) {
				let local_entity = layer_obj.entities[i];
				if (local_entity.class_name.startsWith("Geometry")) {
					let entity_history = local_entity.history;
					let entity_timestamps = entity_history.getTimestamps().map(Number).sort((a, b) => a - b);
					
					if (entity_timestamps.length > 0) {
						if (entity_timestamps[0] < start_date) {
							let start_val = local_entity.getGeometryKeyframeAtDate(start_date);
							let start_keyframe = entity_history.getKeyframe({ date: start_date });
							if (start_val && start_keyframe) entity_history.addKeyframe(start_date, ...start_keyframe.value.slice());
						}
						if (entity_timestamps[entity_timestamps.length - 1] > end_date) {
							let end_val = local_entity.getGeometryKeyframeAtDate(end_date);
							let end_keyframe = entity_history.getKeyframe({ date: end_date });
							if (end_val && end_keyframe) entity_history.addKeyframe(end_date, ...end_keyframe.value.slice());
						}
						
						let current_keys = Object.keys(entity_history.keyframes);
						for (let x = 0; x < current_keys.length; x++) {
							let ts = Number(current_keys[x]);
							if (ts < start_date || ts > end_date) delete entity_history.keyframes[ts];
						}
					}
					
					if (Object.keys(entity_history.keyframes).length === 0) local_entity.remove(true);
				}
				
				console.log(`4. Clip/transfer`, all_timestamps[i], `(${i}/${all_timestamps.length})`);
			}
			console.log(`4. Finished clip/transfer`);
			
			//5. Transfer unlinked entities
			to_layer.entities = to_layer.entities.concat(layer_obj.entities);
			layer_obj.entities = [];
			
			//6. Final cleanup
			if (!json.merge_layer.do_not_delete_after) {
				layer_obj.remove();
			} else {
				layer_obj.fromJSON(from_layer_json);
			}
		}
		
		//set_layer_option
		if (json.set_layer_option)
			layer_obj[json.set_layer_option.key] = json.set_layer_option.value;
	}
};