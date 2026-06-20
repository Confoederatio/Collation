if (!global.naissance) global.naissance = {};

/**
 * Parses a JSON action for a target FeatureLayer.
 * - Static method of: {@link naissance.FeatureLayer}
 *
 * `arg0_json`: {@link Object}|{@link string}
 * - `.feature_obj`: {@link Object}|{@link string} - Identifier. The {@link naissance.Feature} ID to target changes for.
 * <br>
 * - #### Extraneous Commands:
 *   - `.create_layer`: {@link Object}
 *     - `.do_not_refresh=false`: {@link boolean}
 *     - `.id`: {@link string}
 *   - `.merge_layer`: {@link Object}
 *     - `.do_not_delete_after=false`: {@link boolean}
 *     - `.end_date`: {@link number}|{@link Object}
 *     - `.start_date`: {@link number}|{@link Object}
 *     - `.to_layer_id`: {@link string} - The ID of the layer to merge the current layer into.
 * - #### Internal Commands:
 *   - `.set_layer_option`: {@link Object}
 *     - `.key`: {@link string} - The key to change for the selected layer.
 *     - `.value`: {@link any} - What to change the value of the key to.
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
			let from_layer_timestamps = layer_obj.getTimestamps();
			let to_layer = naissance.Feature.instances[json.merge_layer.to_layer_id];
			let to_layer_geometries = to_layer.getAllGeometries();
			let to_layer_timestamps = to_layer.getTimestamps();
			
			let all_timestamps = [...new Set([...from_layer_timestamps, ...to_layer_timestamps])];
				all_timestamps = all_timestamps.sort((a, b) => a - b);
			let end_date = (json.merge_layer.end_date) ?
				json.merge_layer.end_date : from_layer_timestamps[from_layer_timestamps.length - 1];
				end_date = Date.getTimestamp(end_date);
			let start_date = (json.merge_layer.start_date) ? 
				json.merge_layer.start_date : from_layer_timestamps[0];
				start_date = Date.getTimestamp(start_date);
			
			//1. Difference Layer A from Layer B
			let from_layer_union;
			
			for (let i = 0; i < all_timestamps.length; i++)
				if ((all_timestamps[i] >= start_date && all_timestamps[i] <= end_date)) {
					//Update from_layer_union
					if (from_layer_timestamps.includes(all_timestamps[i])) {
						from_layer_union = undefined;
						
						for (let x = 0; x < from_layer_geometries.length; x++) {
							let local_geometry = from_layer_geometries[x];
							let local_keyframe = local_geometry.history.getKeyframe(all_timestamps[i]);
							
							if (local_keyframe?.value?.[0])
								if (local_geometry.class_name === "GeometryPolygon") {
									let local_maptalks_geometry = maptalks.Geometry.fromJSON(local_keyframe.value[0]);
									let local_turf_geometry = Geospatiale.convertMaptalksToTurf(local_maptalks_geometry);
									
									if (from_layer_union === undefined) {
										from_layer_union = local_turf_geometry;
									} else {
										from_layer_union = turf.union(turf.featureCollection([from_layer_union, local_turf_geometry]));
									}
								}
						}
					}
					//Subtract from_layer_union from to_layer
					if (from_layer_union && to_layer_timestamps.includes(all_timestamps[i])) {
						for (let x = 0; x < to_layer_geometries.length; x++) {
							let has_geometry_keyframe = false;
							let local_geometry = to_layer_geometries[x];
							
							//Guard clause to ensure a valid geometry at this timestamp
							if (local_geometry?.history.keyframes?.[all_timestamps[i]]?.[0]) has_geometry_keyframe = true;
							if (!has_geometry_keyframe) continue;
							
							let local_keyframe = local_geometry.history.keyframes[all_timestamps[i]];
						
							if (local_geometry.class_name === "GeometryPolygon") {
								let local_maptalks_geometry = maptalks.Geometry.fromJSON(local_keyframe.value[0]);
								let local_turf_geometry = Geospatiale.convertMaptalksToTurf(local_maptalks_geometry);
								
								local_turf_geometry = turf.difference(turf.featureCollection([local_turf_geometry, from_layer_union]));
								local_maptalks_geometry = Geospatiale.convertTurfToMaptalks(local_turf_geometry);
								
								if (typeof local_maptalks_geometry.toJSON === "function") {
									local_keyframe.value[0] = local_maptalks_geometry.toJSON();
								} else {
									local_keyframe.value[0] = null;
								}
							}
						}
					}
				}
			
			//2. Clean keyframes in Layer B
			let to_layer_geometry_ids = [];
			
			//Iterate over all to_layer_geometries and push their IDs
			for (let i = 0; i < to_layer_geometries.length; i++)
				to_layer_geometry_ids.push(to_layer_geometries[i].id);
			naissance.Geometry.parseActionForGeometries(to_layer_geometry_ids, {
				command: "clean_keyframes",
				key: "clean_keyframes",
				name: "Clean F.Geometry Keyframes",
				value: []
			});
			
			//3. Union linked polygons in Layer A with Layer B
			for (let i = 0; i < from_layer_geometries.length; i++)
				if (from_layer_geometries[i]?.metadata?.linked_id) {
					let active_from_geometry;
					let active_to_geometry;
					let from_geometry = from_layer_geometries[i];
					let to_geometry = naissance.Geometry.instances[from_layer_geometries[i].metadata.linked_id];
					
					if (to_geometry) {
						let from_keyframes = Object.keys(from_geometry.history.keyframes).map(Number);
						let to_keyframes = Object.keys(to_geometry.history.keyframes).map(Number);
						let unique_timestamps = [...new Set([...from_keyframes, ...to_keyframes])];
							unique_timestamps = unique_timestamps.sort((a, b) => a - b);
						
						//Iterate over all unique_timestamps and perform a merge
						for (let i = 0; i < unique_timestamps.length; i++) {
							if (!(start_date >= unique_timestamps[i] && end_date <= unique_timestamps[i])) continue; //Skip merge if not within the bounded range
							
							let from_keyframe = from_geometry.history.keyframes[unique_timestamps[i]];
							let to_keyframe = to_geometry.history.keyframes[unique_timestamps[i]];
							
							if (from_keyframe)
								if (from_keyframe.value[0] !== undefined && from_keyframe.value[0] !== "undefined") {
									let maptalks_geometry = maptalks.Geometry.fromJSON(from_keyframe.value[0]);
									active_from_geometry = Geospatiale.convertMaptalksToTurf(maptalks_geometry);
								} else if (from_keyframe.value[0] === null) {
									active_from_geometry = undefined;
								}
							if (to_keyframe)
								if (to_keyframe.value[0] !== undefined && from_keyframe.value[0] !== "undefined") {
									let maptalks_geometry = maptalks.Geometry.fromJSON(to_keyframe.value[0]);
									active_to_geometry = Geospatiale.convertMaptalksToTurf(maptalks_geometry);
								} else if (to_keyframe.value[0] === null) {
									active_to_geometry = undefined;
								}
							
							//Perform an inclusive or union based on rolling state
							if (active_from_geometry && active_to_geometry) {
								let turf_union = turf.union(turf.featureCollection([active_from_geometry, active_to_geometry]));
								
								to_keyframe.value[0] = Geospatiale.convertTurfToMaptalks(turf_union).toJSON();
							} else {
								to_geometry.history.addKeyframe(unique_timestamps[i],
									Geospatiale.convertTurfToMaptalks((active_from_geometry) ?
										active_from_geometry : active_to_geometry).toJSON());
							}
							
							//Merge values after [0] for from_keyframe
							if (from_keyframe && from_keyframe.value.length > 1) {
								from_keyframe.value.shift(); //Pop geometry coords
								to_geometry.history.addKeyframe(unique_timestamps[i], undefined, ...from_keyframe.value);
							}
						}
					}
					
					//Merge complete, delete from_geometry
					from_geometry.remove(true);
				}
			
			//4. Clip remaining entities from Layer A so they do not have keyframes before or after the start/end dates
			for (let i = 0; i < layer_obj.entities.length; i++) {
				let local_entity = layer_obj.entities[i];
				
				if (local_entity.class_name.startsWith("Geometry")) {
					let from_timestamps = local_entity.history.getTimestamps().map(Number);
						from_timestamps.sort((a, b) => a - b);
					
					if (from_timestamps[0] < start_date) {
						local_entity.history.keyframes[start_date] = local_entity.history.getKeyframe(start_date);
						
						//Iterate over all from_timestamps and remove the ones before start_date; after end_date
						for (let x = 0; x < from_timestamps.length; x++)
							if (from_timestamps[i] < start_date || from_timestamps[i] > end_date)
								delete local_entity.history.keyframes[start_date];
					}
					if (Object.key(local_entity.history.keyframes).length === 0) //Remove empty geometries outside the domain
						local_entity.remove(true);
				}
			}
			
			//5. Move remaining entities from Layer A into Layer B
			to_layer.entities = to_layer.entities.concat(to_layer.entities, layer_obj.entities);
			
			//6. Delete Layer B
			layer_obj.remove();
		}
		
		//set_layer_option
		if (json.set_layer_option)
			layer_obj[json.set_layer_option.key] = json.set_layer_option.value;
	}
};