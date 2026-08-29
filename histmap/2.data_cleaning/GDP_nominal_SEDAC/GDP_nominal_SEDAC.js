global.GDP_nominal_SEDAC = class {
	static bf = `${h1}/GDP_nominal_SEDAC/`;
	static intermediate_ols_folder = `${h2}/GDP_nominal_SEDAC/OLS/`;
	
	static async A_normaliseSEDACRastersToNominal () {
		//Declare local instance variables
		let all_ppp_files = await File.getAllFiles(GDP_PPP_SEDAC.bf);
		let gdp_obj = GDP_nominal.getGDPObject();
		let geocode_obj = admin_modern.getColourcodesObject();
		let geocode_raster = GeoPNG.loadImage(admin_modern.input_geocodes_raster);
		let world_gdp_obj = GDP_nominal.getWorldGDPObject();
		let years = GDP_PPP_SEDAC.years;
		
		//Copy all_ppp_files into this.bf
		for (let i = 0; i < all_ppp_files.length; i++)
			if (all_ppp_files[i].endsWith(".png")) {
				let local_output_file_path = `${this.bf}${path.basename(all_ppp_files[i]).replace("_PPP", "")}`;
				fs.copyFileSync(all_ppp_files[i], local_output_file_path);
				
				console.log(`Copied ${all_ppp_files[i]} to ${local_output_file_path}.`);
				await Blacktraffic.yield();
			}
		
		//Iterate over all_files; normalise them to world_gdp_obj
		for (let i = 0; i < years.length; i++) {
			let local_file_path = `${this.bf}GDP_${years[i]}.png`;
			let local_input_png = GeoPNG.loadNumberRasterImage(local_file_path, {
				format: "float32"
			});
			let local_input_sum = GeoPNG.getImageSum(local_file_path, {
				format: "float32"
			});
			let local_target = world_gdp_obj[years[i]];
			let local_scalar = local_target/local_input_sum;
			
			GeoPNG.saveNumberRasterImage({
				file_path: local_file_path,
				format: "float32",
				width: 4320,
				height: 2160,
				function: (local_index) => local_input_png.data[local_index]*local_scalar
			});
			console.log(`- ${years[i]} - Input GDP: ${String.formatNumber(local_input_sum)}, Target GDP: ${String.formatNumber(local_target)} - Scalar: ${local_scalar}`);
			await Blacktraffic.yield();
		}
		
		//Iterate over all years
		for (let i = 0; i < years.length; i++) {
			let local_gdp_scalars = {};
			let local_gdp_sums = {};
			let local_file_path = `${this.bf}GDP_${years[i]}.png`;
			let local_raster = GeoPNG.loadNumberRasterImage(local_file_path, {
				format: "float32"
			});
			
			//1. Operate over file; populate local_gdp_sums; calculate local_gdp_scalars
			GeoPNG.operateNumberRasterImage({
				file_path: local_file_path,
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
				let local_actual_gdp = gdp_obj[local_key]?.[years[i]];
				local_gdp_scalars[local_key] = (local_actual_gdp) ? local_actual_gdp/local_value : 1;
			});
			
			//2. Scale by local_gdp_scalars
			GeoPNG.saveNumberRasterImage({
				file_path: local_file_path,
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
					let local_value = local_raster.data[local_index];
					
					if (local_geocodes)
						for (let x = 0; x < local_geocodes.length; x++) {
							let local_gdp = gdp_obj[local_geocodes[x]]?.[years[i]];
							if (local_gdp) return local_value*local_gdp_scalars[local_geocodes[x]];
						}
					return local_value;
				}
			});
			console.log(`- Processed ${local_file_path}.`);
			await Blacktraffic.yield();
		}
	}
	
	static async B_loadCovariates (arg0_year, arg1_covariates_obj) {
		//Convert from parameters
		let year = arg0_year;
		let local_covariates_obj = arg1_covariates_obj;
		
		//Declare local instance variables
		let input_file_path = `${this.bf}/GDP_${year}.png`;
		
		//Return statement
		return Statistics.loadOLSCovariates(input_file_path, {
			utility_format: "float32",
			covariates_obj: local_covariates_obj,
			formatting_parameters: [year]
		});
	}
	
	static async B_trainGDPModel (arg0_year, arg1_covariates_obj, arg2_prefix, arg3_options) {
		//Convert from parameters
		let year = arg0_year;
		let local_covariates_obj = arg1_covariates_obj;
		let local_prefix = arg2_prefix;
		let options = (arg3_options) ? arg3_options : {};
		
		//Initialise options
		if (!options.lambda) options.lambda = 1e11;
		if (!options.key) options.key = `${local_prefix}${year}`;
		
		//Declare local instance variables
		let covariates_data = await this.B_loadCovariates(year, local_covariates_obj);
		let output_file_path = `${this.intermediate_ols_folder}/${local_prefix}${year}.json`;
		
		//Return statement
		return Statistics.trainOLSModel(output_file_path, covariates_data, options);
	}
	
	static async B_trainGDPModels (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		let years = GDP_PPP_SEDAC.years;
		
		//Iterate over all years for both model types
		for (let i = 0; i < years.length; i++) {
			let local_year = years[i];
			
			//Train LU model
			await this.B_trainGDPModel(local_year, GDP_PPP_SEDAC.lu_covariates_obj, "OLS_LU_GDP_", {
				...options,
				key: `LU_${local_year}`
			});
			
			//Train POP model
			await this.B_trainGDPModel(local_year, GDP_PPP_SEDAC.pop_covariates_obj, "OLS_POP_GDP_", {
				...options,
				key: `POP_${local_year}`
			});
		}
	}
	
	static async C_geomeanGDPModel () {
		//Compute geometric means for LU and POP separately
		await Statistics.geomeanOLSModels(this.intermediate_ols_folder, "OLS_LU_GDP_");
		await Statistics.geomeanOLSModels(this.intermediate_ols_folder, "OLS_POP_GDP_");
	}
	
	static async D_processGDPModel (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Declare local instance variables
		let lu_model_path = `${this.intermediate_ols_folder}/geomean_OLS_LU_GDP.json`;
		let pop_model_path = `${this.intermediate_ols_folder}/geomean_OLS_POP_GDP.json`;
		let years = GDP_PPP_SEDAC.years;
		
		//Process and adjust the LU model spatially
		let processed_lu_model = await Statistics.processOLSModel(lu_model_path, {
			...options,
			covariates_obj: GDP_PPP_SEDAC.lu_covariates_obj,
			target: (y) => [`${this.bf}/GDP_${y}.png`, "float32"],
			steps: years
		});
		
		//Process and adjust the POP model spatially
		let processed_pop_model = await Statistics.processOLSModel(pop_model_path, {
			...options,
			covariates_obj: GDP_PPP_SEDAC.pop_covariates_obj,
			target: (y) => [`${this.bf}/GDP_${y}.png`, "float32"],
			steps: years
		});
		
		//Calculate sums of processed absolute magnitudes
		let lu_sum = 0;
		let pop_sum = 0;
		
		Object.keys(processed_lu_model.coefficients).forEach(k => lu_sum += Math.abs(processed_lu_model.coefficients[k]));
		Object.keys(processed_pop_model.coefficients).forEach(k => pop_sum += Math.abs(processed_pop_model.coefficients[k]));
		
		//Calculate balancing scalars (50/50 magnitude)
		let total_mag = lu_sum + pop_sum;
		let target_mag = total_mag*0.5;
		let lu_scalar = (lu_sum > 0) ? target_mag/lu_sum : 1;
		let pop_scalar = (pop_sum > 0) ? target_mag/pop_sum : 1;
		
		//Combine the two models into one final model with balanced weights
		let final_coefficients = {};
		
		Object.keys(processed_lu_model.coefficients).forEach(k => final_coefficients[k] = processed_lu_model.coefficients[k] * lu_scalar);
		Object.keys(processed_pop_model.coefficients).forEach(k => final_coefficients[k] = processed_pop_model.coefficients[k] * pop_scalar);
		
		let merged_model = {
			key: "processed_base_model",
			coefficients: final_coefficients
		};
		
		//Save the combined model
		let output_file_path = `${this.intermediate_ols_folder}/processed_base_model.json`;
		fs.writeFileSync(output_file_path, JSON.stringify(merged_model, null, 2));
		console.log(`Merged and balanced Nominal OLS base model saved to ${output_file_path}.`);
		
		//Return statement
		return merged_model;
	}
	
	static async processRasters (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Initialise options
		if (!options.exclude) options.exclude = [];
		
		//1. Normalise SEDAC rasters to nominal GDP
		if (!options.exclude.includes("A")) await this.A_normaliseSEDACRastersToNominal();
		
		//2. OLS processing pipeline
		if (!options.exclude.includes("B")) await this.B_trainGDPModels(options);
		if (!options.exclude.includes("C")) try {
			await this.C_geomeanGDPModel();
		} catch (e) { console.error(e); }
		if (!options.exclude.includes("D")) await this.D_processGDPModel(options);
	}
};