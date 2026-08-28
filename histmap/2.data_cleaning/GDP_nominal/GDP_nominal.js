global.GDP_nominal = class {
	static input_gdp_national_csv = `${h1}/GDP_nominal/gdp_national_eoscala_1.4.csv`;
	static input_gdp_world_json = `${h1}/GDP_nominal/gdp_world_eoscala_1.4.json5`;
	static intermediate_normalised_to_global = `${h3}GDP_nominal/1.scaled_to_global/`;
	static intermediate_scaled_to_national = `${h3}GDP_nominal/2.scaled_to_national/`;
	
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
	
	static async A_scaleGDPRastersToNational () {
		//Declare local instance variables
		let hyde_years = landuse_HYDE.sorted_hyde_years;
		let gdp_obj = this.getGDPObject();
		let geocode_obj = admin_modern.getColourcodesObject();
		let geocode_raster = GeoPNG.loadImage(admin_modern.input_geocodes_raster);
		
		//Iterate over all hyde_years
		for (let i = 0; i < hyde_years.length; i++) {
			let local_ols_file_path = `${this.intermediate_normalised_to_global}GDP_${hyde_years[i]}.png`;
			if (!fs.existsSync(local_ols_file_path)) continue; //Guard clause if nonexistent
			
			//Load in local_ols_raster
			let local_gdp_scalars = {};
			let local_gdp_sums = {};
			let local_ols_raster = GeoPNG.loadNumberRasterImage(local_ols_file_path, {
				format: "float32"
			});
			let local_output_file = `${this.intermediate_scaled_to_national}GDP_${hyde_years[i]}.png`;
			
			//1. Operate over file; populate local_gdp_sums; calculate local_gdp_scalars
			GeoPNG.operateNumberRasterImage({
				file_path: local_ols_file_path,
				format: "float32",
				function: (local_index, local_value) => {
					let local_colour_key = [
						geocode_raster.data[local_index],
						geocode_raster.data[local_index + 1],
						geocode_raster.data[local_index + 2]
					].join(",");
					let local_geocodes = geocode_obj[local_colour_key];
					
					if (local_geocodes)
						for (let x = 0; x < local_geocodes.length; x++)
							Object.modifyValue(local_gdp_sums, local_geocodes[x], local_value);
				}
			});
			Object.iterate(local_gdp_sums, (local_key, local_value) => {
				let local_actual_gdp = gdp_obj[local_key][hyde_years[i]];
				
				if (local_actual_gdp) {
					local_gdp_scalars[local_key] = local_actual_gdp/local_value;
				} else {
					local_gdp_scalars[local_key] = 1;
				}
			});
			console.log(`- Local OLS object:`, local_gdp_sums);
			console.log(`- Local OLS scalars:`, local_gdp_scalars);
			
			//2. Scale by local_gdp_scalars
			GeoPNG.saveNumberRasterImage({
				file_path: local_output_file,
				format: "float32",
				height: 2160,
				width: 4320,
				function: (local_index) => {
					let byte_index = local_index*4;
					let local_colour_key = [
						geocode_raster.data[byte_index],
						geocode_raster.data[byte_index + 1],
						geocode_raster.data[byte_index + 2]
					].join(",");
					let local_geocodes = geocode_obj[local_colour_key];
					let local_value = local_ols_raster.data[local_index];
					
					//Iterate over local_geocodes
					if (local_geocodes)
						for (let x = 0; x < local_geocodes.length; x++) {
							let local_gdp = gdp_obj[local_geocodes[x]][hyde_years[i]];
							
							//Return statement
							if (local_gdp)
								return local_value*local_gdp_scalars[local_geocodes[x]];
						}
					return local_value;
				}
			});
			console.log(`Processed ${local_output_file}.`);
			await Blacktraffic.yield();
		}
	}
	
	static async B_scaleGDPRastersToGlobal (arg0_input_folder, arg1_output_folder) {
		//Convert from parameters
		let input_folder = arg0_input_folder;
		let output_folder = arg1_output_folder;
		
		//Declare local instance variables
		let hyde_years = landuse_HYDE.sorted_hyde_years;
		let world_gdp_obj = this.getWorldGDPObject();
		
		//Iterate over all hyde_years
		for (let i = 0; i < hyde_years.length; i++) {
			let local_ols_file_path = `${input_folder}GDP_${hyde_years[i]}.png`;
			if (!fs.existsSync(local_ols_file_path)) continue; //Guard clause if nonexistent
			
			let local_input_png = GeoPNG.loadNumberRasterImage(local_ols_file_path, {
				format: "float32"
			});
			let local_input_sum = GeoPNG.getImageSum(local_ols_file_path, {
				format: "float32"
			});
			let local_target = world_gdp_obj[hyde_years[i]];
			
			let local_scalar = local_target/local_input_sum;
			
			GeoPNG.saveNumberRasterImage({
				file_path: `${output_folder}GDP_${hyde_years[i]}.png`,
				format: "float32",
				width: 4320,
				height: 2160,
				function: (local_index) => local_input_png.data[local_index]*local_scalar
			});
			console.log(`- ${hyde_years[i]} - Input GDP: ${String.formatNumber(local_input_sum)}, Target GDP: ${String.formatNumber(local_target)} - Scalar: ${local_scalar}`);
			await Blacktraffic.yield();
		}
	}
	
	static async processRasters (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Initialise options
		if (!options.exclude) options.exclude = [];
		
		//Process intermediates
		if (!options.exclude.includes("B1"))
			await this.B_scaleGDPRastersToGlobal(`${GDP_nominal_OLS.output_ols_folder}OLS_`, this.intermediate_normalised_to_global);
		if (!options.exclude.includes("A"))
			await this.A_scaleGDPRastersToNational();
	}
};