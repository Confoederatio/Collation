naissance.Feature.importFile = function (arg0_file_path, arg1_type) {
	
};

/**
 * Imports a GeoJSON object into the current Feature.
 * 
 * @param {Object|string} arg0_geojson_obj
 * @param {Object} [arg1_options]
 *  @param {string} [arg1_options.id_key] - The ID key to look for in .properties.
 *  @param {string} [arg1_options.lineColor_key]
 *  @param {string} [arg1_options.lineOpacity_key]
 *  @param {string} [arg1_options.lineWidth_key]
 *  @param {string} [arg1_options.polygonFill_key]
 *  @param {string} [arg1_options.polygonOpacity_key]
 */
naissance.Feature.importGeoJSON = function (arg0_geojson_obj, arg1_options) {
	//Convert from parameters
	let geojson_obj = (typeof arg0_geojson_obj === "string") ? 
		JSON.parse(arg0_geojson_obj) : arg0_geojson_obj;
	let options = (arg1_options) ? arg1_options : {};
	
	//Declare local instance variables
	let type_map = {
		"Point": "GeometryPoint",
		"LineString": "GeometryLine",
		"Polygon": "GeometryPolygon",
		
		"MultiPoint": "GeometryPoint",
		"MultiLineString": "GeometryLine",
		
	};
	
	//Iterate over all geojson_obj entries
}

naissance.Feature.operate = function (arg0_type, arg1_entity_id) {
	//Convert from parameters
	let type = (arg0_type) ? arg0_type : "union";
	let entity_id = arg1_entity_id;
	
	//Declare local instance variables
	let geometries = this.getAllGeometries();
	let ot_feature_obj = naissance.Feature.instances[entity_id];
	let ot_geometry_obj = naissance.Geometry.instances[entity_id];
	
	//ot_feature_obj handling
	let ot_turf_geometry;
	
	if (ot_feature_obj?.entities) {
		let ot_geometries = ot_feature_obj.getAllGeometries();
		
		//Special handling for union
		if (type === "union") {
			//Iterate over all ot_geometries
			for (let i = 0; i < ot_geometries.length; i++) {
				let linked_geometry;
				
				if (ot_geometries[i]?.metadata?.linked_id)
					for (let x = 0; x < geometries.length; x++)
						if (geometries[x].id === ot_geometries[i].metadata.linked_id) {
							linked_geometry = geometries[x];
							break;
						}
				
				//Merge current geometry with linked geometry
				if (linked_geometry) {
					let maptalks_geometry = naissance.Geometry.operate.call(linked_geometry, ot_geometries[i].id, "union");
					if (maptalks_geometry !== null) maptalks_geometry = maptalks_geometry.toJSON();
					linked_geometry.addKeyframe(main.date, maptalks_geometry);
				}
				//Just copy the geometry over
				else if (ot_geometries[i].geometry) {
					let geometry_obj = new naissance[ot_geometries[i].class_name]({ is_import: true });
					geometry_obj.addKeyframe(main.date, ot_geometries[i].geometry.toJSON());
					geometry_obj.parent = this;
					geometry_obj.entities.push(ot_geometries[i]);
				}
			}
		} else {
			ot_turf_geometry = ot_feature_obj.getTurfGeometry();
		}
	}
	
	if (ot_geometry_obj?.geometry)
		ot_turf_geometry = Geospatiale.convertMaptalksToTurf(ot_geometry_obj.geometry);
	
	//Iterate through geometries and apply naissance.Geometry.operate
	if (ot_turf_geometry)
		for (let i = 0; i < geometries.length; i++) {
			let maptalks_geometry = naissance.Geometry.operate.call(geometries[i], type, ot_turf_geometry);
			if (maptalks_geometry !== null) maptalks_geometry = maptalks_geometry.toJSON();
			geometries[i].addKeyframe(main.date, maptalks_geometry);
		}
};