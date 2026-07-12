/**
 * - #### Extraneous Commands:
 * - `.move_keyframe`: {@link Object}
 *   - `.from_timestamp`: {@link number}|{@link Object}
 *   - `.to_timestamp`: {@link number}|{@link Object}
 * - `.set_map_spatial_reference`: {@link Object}
 * 
 * @type {Object}
 */
config.actions.renderer = {
	move_keyframe: {
		name: "Move Keyframe",
		scope: ["Renderer"],
		
		special_function: async function (json) {
			//Declare local instance variables
			let from_timestamp = Date.getTimestamp(json.move_keyframe.from_timestamp);
			let to_timestamp = Date.getTimestamp(json.move_keyframe.to_timestamp);
			
			//Iterate over all naissance.Geometry.instances and move any keyframes found at from_timestamp to to_timestamp
			Object.iterate(naissance.Geometry.instances, (local_key, local_geometry) =>
				local_geometry.history.moveKeyframe(from_timestamp, to_timestamp));
		}
	},
	set_map_spatial_reference: {
		name: "Set Map Spatial Reference",
		scope: ["Renderer"],
		
		special_function: async function (json) {
			map.setSpatialReference(json.set_map_spatial_reference);
			console.log(`Set spatial reference:`, json.set_map_spatial_reference);
			
			//Refresh naissance.FeatureTileLayers this.draw() call
			Object.iterate(naissance.Feature.instances, (local_key, local_feature) =>
				local_feature.draw());
		}
	}
};