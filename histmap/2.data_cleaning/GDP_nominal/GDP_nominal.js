global.GDP_nominal = class {
	static input_gdp_national_csv = `${h1}/GDP_nominal/gdp_national_eoscala_1.4.csv`;
	static input_gdp_world_json = `${h1}/GDP_nominal/gdp_world_eoscala_1.4.json5`;
	
	/**
	 * Fetches a {"<year>": {@link number}} map per geocode for GDP nominal.
	 *
	 * @returns {Object}
	 */
	static getGDPObject () {
		//Declare local instance variables
		let gdp_csv = File.loadCSVAsJSON(this.input_gdp_national_csv, {
			delimiter: ",",
			mode: "vertical"
		});
		let gdp_obj = {};
		let hyde_years = landuse_HYDE.sorted_hyde_years;
		
		//Destructure gdp_csv into gdp_obj
		Object.iterate(gdp_csv, (local_key, local_value) => {
			//Iterate over all geocodes in a given year
			Object.iterate(local_value, (local_geocode, local_string) => {
				if (local_string[0] !== "") {
					if (!gdp_obj[local_geocode]) gdp_obj[local_geocode] = {};
					let local_gdp = parseFloat(local_string[0]);
					
					if (!isNaN(local_gdp))
						gdp_obj[local_geocode][local_key] = local_gdp;
				}
			})
		});
		
		//Iterate over all hyde_years, and if it doesn't exist, cubic spline interpolate
		Object.iterate(gdp_obj, (local_key, local_value) => {
			gdp_obj[local_key] = Object.cubicSplineInterpolation(local_value, { 
				years: hyde_years 
			});
		});
		
		//Return statement
		return gdp_obj;
	}
	
	/**
	 * Returns estimations of World GDP PPP as an object map.
	 *
	 * @returns {Object}
	 */
	static getWorldGDPObject () {
		//Declare local instance variables
		let gdp_obj = {};
		let hyde_years = landuse_HYDE.sorted_hyde_years;
		let raw_gdp_obj = JSON5.parse(fs.readFileSync(this.input_gdp_world_json));
		
		//Iterate over raw_gdp_obj; populate raw figures
		Object.iterate(raw_gdp_obj, (local_key, local_value) => {
			Object.iterate(local_value.gdp, (local_subkey, local_subvalue) => {
				let local_scalar = Math.returnSafeNumber(local_value?.scalar, 1);
				let local_gdp = local_subvalue*local_scalar;
				
				if (!gdp_obj[local_subkey]) {
					gdp_obj[local_subkey] = [local_gdp];
				} else {
					gdp_obj[local_subkey].push(local_gdp);
				}
			});
		});
		Object.iterate(gdp_obj, (local_key, local_value) => 
			gdp_obj[local_key] = Math.weightedGeometricMean(local_value));
		
		//Return statement
		return Object.cubicSplineInterpolation(gdp_obj, { years: hyde_years });
	}
};