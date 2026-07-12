//Initialise functions
{
	if (!global.Geospatiale)
		/**
		 * The namespace for all UF/Geospatiale utility functions, typically for static methods.
		 * 
		 * @namespace Geospatiale
		 */
		global.Geospatiale = {};
	
	/**
	 * Converts a {@link maptalks.Geometry} into a {@link turf.Geometry}.
	 *
	 * @param {maptalks.Geometry} arg0_geometry
	 *
	 * @returns {turf.Feature|null}
	 */
	//[QUARANTINE]
	Geospatiale.convertMaptalksToTurf = function (arg0_geometry) {
		let geometry = arg0_geometry;
		
		if (Geospatiale.getCoordsType(geometry) === "turf_geometry") return geometry;
		if (geometry === null) return null;
		
		try {
			//console.time(`convertMaptalksToTurf`);
			if (typeof geometry === "object" && typeof geometry.toJSON !== "function") {
				let temp_geometry = maptalks.GeoJSON.toGeometry(geometry);
				geometry = temp_geometry === null ? maptalks.Geometry.fromJSON(geometry) : temp_geometry;
			}
			
			let geojson = geometry.toGeoJSON();
			let geometry_data = geojson.geometry ? geojson.geometry : geojson;
			
			//Post-process Geometry
			let clean_geometry_data = function (arg1_data) {
				if (!arg1_data) return null;
				
				// Handle Polygon Cleaning
				if (arg1_data.type === "Polygon") {
					let valid_rings = [];
					for (let i = 0; i < arg1_data.coordinates.length; i++) {
						let local_ring = arg1_data.coordinates[i];
						let clean_ring = [];
						
						// Deduplicate points to calculate true topological length
						if (local_ring) {
							for (let x = 0; x < local_ring.length; x++) {
								let point_a = local_ring[x];
								let point_b = clean_ring[clean_ring.length - 1];
								let is_duplicate = point_b ? point_a[0] === point_b[0] && point_a[1] === point_b[1] : false;
								if (!is_duplicate) clean_ring.push(point_a);
							}
						}
						
						if (clean_ring.length >= 4) {
							valid_rings.push(local_ring);
						} else {
							if (i === 0) return null;
						}
					}
					arg1_data.coordinates = valid_rings;
					return arg1_data.coordinates.length > 0 ? arg1_data : null;
				}
				// Handle MultiPolygon Cleaning
				else if (arg1_data.type === "MultiPolygon") {
					let valid_polygons = [];
					for (let i = 0; i < arg1_data.coordinates.length; i++) {
						let local_polygon = arg1_data.coordinates[i];
						let valid_rings = [];
						let is_poly_valid = true;
						
						for (let x = 0; x < local_polygon.length; x++) {
							let local_ring = local_polygon[x];
							let clean_ring = [];
							
							if (local_ring) {
								for (let y = 0; y < local_ring.length; y++) {
									let point_a = local_ring[y];
									let point_b = clean_ring[clean_ring.length - 1];
									let is_duplicate = point_b ? point_a[0] === point_b[0] && point_a[1] === point_b[1] : false;
									if (!is_duplicate) clean_ring.push(point_a);
								}
							}
							
							if (clean_ring.length >= 4) {
								valid_rings.push(local_ring);
							} else {
								if (x === 0) {
									is_poly_valid = false;
									break;
								}
							}
						}
						
						if (is_poly_valid && valid_rings.length > 0) {
							valid_polygons.push(valid_rings);
						}
					}
					arg1_data.coordinates = valid_polygons;
					return arg1_data.coordinates.length > 0 ? arg1_data : null;
				}
				// Recursive check for GeometryCollections
				else if (arg1_data.type === "GeometryCollection") {
					let valid_geometries = [];
					for (let i = 0; i < arg1_data.geometries.length; i++) {
						let cleaned_sub_geom = clean_geometry_data(arg1_data.geometries[i]);
						if (cleaned_sub_geom) valid_geometries.push(cleaned_sub_geom);
					}
					arg1_data.geometries = valid_geometries;
					return arg1_data.geometries.length > 0 ? arg1_data : null;
				}
				
				return arg1_data;
			};
			
			let final_geometry = clean_geometry_data(geometry_data);
			
			return final_geometry ? turf.feature(final_geometry) : null;
		} catch (e) {
			return typeof geometry === "object" ? geometry : null;
		}
	};
	
	/**
	 * Converts a {@link turf.Geometry} into a {@link maptalks.Geometry}
	 * 
	 * @param {turf.Geometry} arg0_geometry
	 * 
	 * @returns {maptalks.Geometry|maptalks.GeometryCollection}
	 */
	Geospatiale.convertTurfToMaptalks = function (arg0_geometry) {
		const geometry = arg0_geometry;
		
		//Internal guard clause if the geometry is already a Maptalks geometry
		if (Geospatiale.getCoordsType(geometry) === "maptalks_geometry") return geometry;
		if (geometry === null) return null;
		
		// Handle Turf Feature or raw geometry
		let feature = geometry;
		if (geometry.type !== "Feature")
			feature = { type: "Feature", geometry: geometry, properties: {} };
		
		//Convert using Maptalks built-in
		let result = maptalks.GeoJSON.toGeometry(feature);
		
		//Return statement; handle array results (MultiPolygon becomes array)
		if (Array.isArray(result))
			return new maptalks.GeometryCollection(result);
		return result;
	};
	
	/**
	 * Returns the coords/geometry format the variable represents.
	 * 
	 * @param {*} arg0_format - The coords/geometry format to input.
	 *
	 * @returns {String} - Either 'geojson_coords'/'geojson_geometry'/'leaflet_coords'/'leaflet_geometry'/'maptalks_coords'/'maptalks_geometry'/'naissance_coords'/'naissance_geometry'/'turf_coords'/'turf_geometry'.
	 */
	Geospatiale.getCoordsType = function (arg0_format) {
		//Convert from parameters
		let format = arg0_format;
		
		//Guard clause if format does not exist
		if (!format)
			return undefined;
		
		//Check if type is 'turf_geometry'
		if (typeof format.toJSON !== "function" && format.type) { //GeoJSON cannot have live functions bound to it
			return "turf_geometry";
		} else {
			return "maptalks_geometry";
		}
	};
	
	/**
	 * Whether the coords type being tested are loosely GeoJSON compatible.
	 * 
	 * @param {*} arg0_coords
	 *
	 * @returns {boolean}
	 */
	Geospatiale.isGeoJSONCoords = function (arg0_coords) {
		//Convert from parameters
		let coords = arg0_coords;
		
		//Internal guard clauses to ensure compatibility
		if (!Array.isArray(coords)) return;
		if (!Array.isArray(coords[0])) return;
		
		//Return statement
		return coords.every(Geospatiale.isGeoJSONCoords);
	};
}