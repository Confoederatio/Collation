global.GDP_pc = class {
	static cf = `${h3}/GDP_pc/`;
	static input_covariates_obj = () => {
		let covariates_obj = {
			...GDP_PPP_SEDAC.covariates_obj
		};
		
		//Delete covariates which double count pops
		delete covariates_obj["rurc_"];
		delete covariates_obj["urbc_"];
		
		//Return statement
		return covariates_obj;
	};
	static input_gdp_pc_folder = `${this.cf}rasters/`;
	static intermediate_ols_folder = `${this.cf}1.OLS/`;
	static intermediate_ols_rasters_folder = `${this.cf}2.OLS_pc_estimates/`;
	static intermediate_pc_estimates_folder = `${this.cf}3.pc_estimates/`;
	static intermediate_gdp_folder = `${this.cf}/4.GDP_rasters/`;
	static intermediate_gdp_scaled_to_global = `${this.cf}/5.scaled_to_global/`;
	static intermediate_gdp_interpolated = `${this.cf}/6.interpolated/`;
	static intermediate_gdp_scaled_to_national = `${this.cf}/7.scaled_to_national/`;
	static output_gdp_pc_folder = `${this.cf}/8.GDP_nominal_pc_rasters/`;
	
	//HYDE; Stadestér formatters
	static hf = () => `${landuse_HYDE.bf}/rasters/`;
	static hf1 = (y) => landuse_HYDE._getHYDEYearName(y);
	static sf = () => population_Stadester_Legacy;
	
	static async A_generateGDP_pcRasters () {
		//Declare local instance variables
		let hyde_years = landuse_HYDE.sorted_hyde_years;
		
		for (let i = 0; i < hyde_years.length; i++) {
			let local_gdp_file_path = `${GDP_nominal.intermediate_scaled_to_national}GDP_${hyde_years[i]}.png`;
			let local_popc_file_path = `${population_Stadester_Legacy.input_popc_folder}stadester_population_${hyde_years[i]}.png`;
			
			if (fs.existsSync(local_gdp_file_path) && fs.existsSync(local_popc_file_path)) {
				let local_gdp_raster = GeoPNG.loadNumberRasterImage(local_gdp_file_path, {
					format: "float32"
				});
				let local_popc_raster = GeoPNG.loadNumberRasterImage(local_popc_file_path, {
					format: "int32"
				});
				let local_output_file_path = `${this.input_gdp_pc_folder}GDP_pc_${hyde_years[i]}.png`;
				
				GeoPNG.saveNumberRasterImage({
					file_path: local_output_file_path,
					format: "float32",
					width: 4320,
					height: 2160,
					function: (local_index) => {
						//Declare local instance variables
						let local_gdp_pc = local_gdp_raster.data[local_index]/local_popc_raster.data[local_index];
						
						//Return statement
						if (isNaN(local_gdp_pc)) return 0;
						return local_gdp_pc;
					}
				});
				console.log(`- Saved ${local_output_file_path}.`);
				await Blacktraffic.yield();
			}
		}
	}
	
	static async B_loadCovariates (arg0_year) {
		//Convert from parameters
		let year = arg0_year;
		
		//Declare local instance variables
		let input_file_path = `${this.input_gdp_pc_folder}/GDP_pc_${year}.png`;
		
		//Return statement
		return Statistics.loadOLSCovariates(input_file_path, {
			utility_format: "float32",
			
			covariates_obj: this.input_covariates_obj(),
			formatting_parameters: [year]
		});
	}
	
	static async B_trainGDP_pcModel (arg0_year, arg1_options) {
		//Convert from parameters
		let year = parseInt(arg0_year);
		let options = (arg1_options) ? arg1_options : {};
		
		//Initialise options
		if (!options.lambda) options.lambda = 1e6;
		if (!options.key) options.key = year.toString();
		if (!options.weighting_function) options.weighting_function = (value) => Math.abs(value);
		
		//Declare local instance variables
		let covariates_obj = await this.B_loadCovariates(year);
		let output_file_path =  `${this.intermediate_ols_folder}/OLS_GDP_pc_${year}.json`;
		
		//Return statement
		return Statistics.trainOLSModel(output_file_path, covariates_obj, options);
	}
	
	static async B_trainGDP_pcModels (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Declare local instance variables
		let years = landuse_HYDE.sorted_hyde_years;
		
		//Iterate over all years
		for (let i = 0; i < years.length; i++)
			await this.B_trainGDP_pcModel(years[i], {
				...options,
				key: years[i]
			});
	}
	
	static async C_generateOLS_GDP_pcRasters () {
		//Declare local instance variables
		let landarea_raster = GeoPNG.loadNumberRasterImage(metadata_HYDE.input_raster_land_area, {
			format: "int32"
		});
		let years = landuse_HYDE.sorted_hyde_years;
		
		//Iterate over all years
		for (let i = 0; i < years.length; i++) {
			let local_input_path = `${this.intermediate_ols_folder}OLS_GDP_pc_${years[i]}.json`;
			if (!fs.existsSync(local_input_path)) {
				console.warn(`- Could not load OLS for ${local_input_path}.`);
				continue;
			}
			let local_output_path = `${this.intermediate_ols_rasters_folder}OLS_GDP_pc_${years[i]}.png`;
			
			//Return statement
			await Statistics.generateOLSRaster(local_output_path, {
				covariates_obj: this.input_covariates_obj(),
				format: "float32",
				formatting_parameters: [years[i]],
				model_obj: JSON.parse(fs.readFileSync(local_input_path, "utf8")),
				
				guard_clause: (local_index, rasters_obj) => {
					//Declare local instance variables
					let local_population = Math.returnSafeNumber(rasters_obj["popd_"]?.data[local_index], 0);
					
					//Return statement; guard clause for uninhabited pixels and HYDE clamping
					return !(local_population === 0 || landarea_raster.data[local_index] === 0);
				}
			});
			await Blacktraffic.yield();
		}
	}
	
	static async D_normaliseGDP_pcRasters () {
		//Declare local instance variables
		let years = landuse_HYDE.sorted_hyde_years;
		let global_prev_max = 0;
		
		//Iterate over all years
		for (let i = 0; i < years.length; i++) {
			let first_pass_domain = [Infinity, -Infinity];
			let first_pass_path = `${this.input_gdp_pc_folder}GDP_pc_${years[i]}.png`;
			let first_pass_raster = GeoPNG.loadNumberRasterImage(first_pass_path, {
				format: "float32"
			});
			let second_pass_domain = [Infinity, -Infinity];
			let second_pass_path = `${this.intermediate_ols_rasters_folder}OLS_GDP_pc_${years[i]}.png`;
			let second_pass_raster = GeoPNG.loadNumberRasterImage(second_pass_path, {
				format: "float32"
			});
			
			let output_path = `${this.intermediate_pc_estimates_folder}GDP_pc_${years[i]}.png`;
			let current_iteration_max = 0;
			
			//Fetch first_pass_domain, second_pass_domain
			for (let x = 0; x < first_pass_raster.data.length; x++) {
				let local_value = first_pass_raster.data[x];
				
				if (local_value > first_pass_domain[1]) first_pass_domain[1] = local_value;
				if (local_value < first_pass_domain[0]) first_pass_domain[0] = local_value;
			}
			for (let x = 0; x < second_pass_raster.data.length; x++) {
				let local_value = second_pass_raster.data[x];
				
				if (local_value > second_pass_domain[1]) second_pass_domain[1] = local_value;
				if (local_value < second_pass_domain[0]) second_pass_domain[0] = local_value;
			}
			
			let first_pass_min = first_pass_domain[0];
			let first_pass_max = first_pass_domain[1];
			let second_pass_min = second_pass_domain[0];
			let second_pass_max = second_pass_domain[1];
			
			let first_pass_range = first_pass_max - first_pass_min;
			let second_pass_range = second_pass_max - second_pass_min;
			
			GeoPNG.saveNumberRasterImage({
				file_path: output_path,
				format: "float32",
				height: 2160,
				width: 4320,
				function: (local_index) => {
					//Declare local instance variables
					let first_pass_value = first_pass_raster.data[local_index];
					let second_pass_value = second_pass_raster.data[local_index];
					
					//Calculate the percentile of the second pass value. Ensure we don't divide by zero if the range is 0
					let second_pass_fraction = (second_pass_range !== 0) ?
						second_pass_value/second_pass_range : 0;
					
					let result_value = first_pass_value + (first_pass_range*second_pass_fraction);
					
					//Handle extreme outliers by clamping to the previous year's maximum if current value is > 10x
					if (i > 0 && global_prev_max > 0)
						if (result_value > global_prev_max * 10) result_value = global_prev_max;
					
					if (result_value > current_iteration_max) current_iteration_max = result_value;
					
					return result_value;
				}
			});
			
			global_prev_max = current_iteration_max;
			console.log(`- Saved ${output_path}.`);
			await Blacktraffic.yield();
		}
	}
	
	static async E_generateGDPRasters () {
		//Declare local instance variables
		let years = landuse_HYDE.sorted_hyde_years;
		
		//Iterate over all years
		for (let i = 0; i < years.length; i++) {
			let pc_path = `${this.intermediate_pc_estimates_folder}GDP_pc_${years[i]}.png`;
			let pop_path = `${population_Stadester_Legacy.input_popc_folder}stadester_population_${years[i]}.png`;
			let output_path = `${this.intermediate_gdp_folder}GDP_${years[i]}.png`;
			
			if (fs.existsSync(pc_path) && fs.existsSync(pop_path)) {
				let pc_raster = GeoPNG.loadNumberRasterImage(pc_path, { format: "float32" });
				let pop_raster = GeoPNG.loadNumberRasterImage(pop_path, { format: "int32" });
				
				GeoPNG.saveNumberRasterImage({
					file_path: output_path,
					format: "float32",
					width: 4320,
					height: 2160,
					function: (local_index) => pc_raster.data[local_index]*pop_raster.data[local_index]
				});
				console.log(`- Saved total GDP: ${output_path}`);
				await Blacktraffic.yield();
			}
		}
	}
	
	static async F_scaleGDPRastersToGlobal () {
		//Return statement; Reusing logic from GDP_nominal core class
		return GDP_nominal.A_scaleGDPRastersToGlobal(
			this.intermediate_gdp_folder,
			this.intermediate_gdp_scaled_to_global
		);
	}
	
	static async G_interpolateToSEDAC () {
		//Declare local instance variables
		let sedac_domain = [1800, 1990];
		let sedac1_domain = [1800, 1950];
		let sedac2_domain = [1950, 1990];
		let hyde_years = landuse_HYDE.sorted_hyde_years;
		let to_path = `${GDP_nominal_SEDAC.bf}GDP_1990.png`;
		let year_gap = sedac_domain[1] - sedac_domain[0];
		let year_gap2 = sedac2_domain[1] - sedac2_domain[0];
		let world_gdp_obj = GDP_nominal.getWorldGDPObject();
		
		if (!fs.existsSync(this.intermediate_gdp_interpolated))
			fs.mkdirSync(this.intermediate_gdp_interpolated, { recursive: true });
		
		//Iterate over all landuse_HYDE.hyde_years
		for (let i = 0; i < hyde_years.length; i++) {
			let current_year = hyde_years[i];
			let local_from_path = `${this.intermediate_gdp_scaled_to_global}GDP_${current_year}.png`;
			let local_output_path = `${this.intermediate_gdp_interpolated}GDP_${current_year}.png`;
			
			if (current_year < sedac_domain[0]) {
				if (fs.existsSync(local_from_path)) {
					fs.copyFileSync(local_from_path, local_output_path);
					console.log(`- Copying global scaled GDP directly for year ${current_year}.`);
				}
			} else if (current_year >= sedac_domain[0] && current_year < sedac_domain[1]) {
				let fraction = (current_year - sedac_domain[0])/year_gap;
				
				if (current_year < sedac1_domain[1]) {
					GeoPNG.linearInterpolation(local_from_path, to_path, local_output_path, {
						format: "float32",
						fraction,
						upper_value_threshold: 256
					});
					console.log(`- (1st-pass) Finished interpolating ${local_from_path} to SEDAC nominal 1990.`);
				} else {
					let threshold_fraction = (current_year - sedac2_domain[0])/year_gap2;
					
					GeoPNG.linearInterpolation(local_from_path, to_path, local_output_path, {
						format: "float32",
						fraction,
						threshold_fraction
					});
					console.log(`- (2nd-pass) Finished interpolating ${local_from_path} to SEDAC nominal 1990.`);
				}
			} else if (current_year >= 1990 && current_year <= 2022) {
				let local_sedac_path = `${GDP_nominal_SEDAC.bf}GDP_${current_year}.png`;
				if (fs.existsSync(local_sedac_path)) {
					fs.copyFileSync(local_sedac_path, local_output_path);
					console.log(`- Copying SEDAC template directly for year ${current_year}.`);
				}
			} else {
				let template_path = `${GDP_nominal_SEDAC.bf}GDP_2022.png`;
				
				if (fs.existsSync(template_path)) {
					let template_raster = GeoPNG.loadNumberRasterImage(template_path, { format: "float32" });
					let template_sum = GeoPNG.getImageSum(template_path, { format: "float32" });
					let target_global = Math.returnSafeNumber(world_gdp_obj[current_year], template_sum);
					let global_scalar = target_global/template_sum;
					
					GeoPNG.saveNumberRasterImage({
						file_path: local_output_path,
						format: "float32",
						width: 4320,
						height: 2160,
						function: (local_index) => template_raster.data[local_index] * global_scalar
					});
					console.log(`- Created post-2022 global scaled template from SEDAC nominal 2022 for year ${current_year}.`);
				}
			}
			await Blacktraffic.yield();
		}
	}
	
	static async H_scaleGDPRastersToNational () {
		//Declare local instance variables
		let hyde_years = landuse_HYDE.sorted_hyde_years;
		let gdp_obj = GDP_nominal.getGDPObject();
		let geocode_obj = admin_modern.getColourcodesObject();
		let geocode_raster = GeoPNG.loadImage(admin_modern.input_geocodes_raster);
		
		//Iterate over all hyde_years
		for (let i = 0; i < hyde_years.length; i++) {
			let local_input_file_path = `${this.intermediate_gdp_interpolated}GDP_${hyde_years[i]}.png`;
			if (!fs.existsSync(local_input_file_path)) continue; //Guard clause if nonexistent
			
			//Load in local input raster
			let local_gdp_scalars = {};
			let local_gdp_sums = {};
			let local_input_raster = GeoPNG.loadNumberRasterImage(local_input_file_path, {
				format: "float32"
			});
			let local_output_file = `${this.intermediate_gdp_scaled_to_national}GDP_${hyde_years[i]}.png`;
			
			//1. Operate over file; populate local_gdp_sums; calculate local_gdp_scalars
			GeoPNG.operateNumberRasterImage({
				file_path: local_input_file_path,
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
				let local_actual_gdp = gdp_obj[local_key]?.[hyde_years[i]];
				
				if (local_actual_gdp) {
					local_gdp_scalars[local_key] = local_actual_gdp/local_value;
				} else {
					local_gdp_scalars[local_key] = 1;
				}
			});
			console.log(`- Local GDP object:`, local_gdp_sums);
			console.log(`- Local GDP scalars:`, local_gdp_scalars);
			
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
					let local_value = local_input_raster.data[local_index];
					
					//Iterate over local_geocodes
					if (local_geocodes)
						for (let x = 0; x < local_geocodes.length; x++) {
							let local_gdp = gdp_obj[local_geocodes[x]]?.[hyde_years[i]];
							
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
	
	static async I_recalculateGDP_pcRasters () {
		//Declare local instance variables
		let hyde_years = landuse_HYDE.sorted_hyde_years;
		
		for (let i = 0; i < hyde_years.length; i++) {
			let total_file_path = `${this.intermediate_gdp_scaled_to_national}GDP_${hyde_years[i]}.png`;
			let popc_file_path = `${population_Stadester_Legacy.input_popc_folder}stadester_population_${hyde_years[i]}.png`;
			let output_file_path = `${this.output_gdp_pc_folder}GDP_pc_${hyde_years[i]}.png`;
			
			if (fs.existsSync(total_file_path) && fs.existsSync(popc_file_path)) {
				let total_raster = GeoPNG.loadNumberRasterImage(total_file_path, { format: "float32" });
				let popc_raster = GeoPNG.loadNumberRasterImage(popc_file_path, { format: "int32" });
				
				GeoPNG.saveNumberRasterImage({
					file_path: output_file_path,
					format: "float32",
					width: 4320,
					height: 2160,
					function: (local_index) => {
						let local_pop = popc_raster.data[local_index];
						let local_val = (local_pop > 0) ? total_raster.data[local_index] / local_pop : 0;
						
						return (isNaN(local_val)) ? 0 : local_val;
					}
				});
				console.log(`- Finalized top-down GDP nominal pc: ${output_file_path}`);
				await Blacktraffic.yield();
			}
		}
	}
	
	static async processRasters (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Initialise options
		if (!options.exclude) options.exclude = [];
		
		//1. Generate GDP_pc rasters
		if (!options.exclude.includes("A")) await this.A_generateGDP_pcRasters();
		//2. 2nd-pass OLS training
		if (!options.exclude.includes("B")) await this.B_trainGDP_pcModels(options);
		if (!options.exclude.includes("C")) await this.C_generateOLS_GDP_pcRasters();
		if (!options.exclude.includes("D")) await this.D_normaliseGDP_pcRasters();
		
		//3. Ensemble regeneration and scaling
		if (!options.exclude.includes("E")) await this.E_generateGDPRasters();
		if (!options.exclude.includes("F")) await this.F_scaleGDPRastersToGlobal();
		if (!options.exclude.includes("G")) await this.G_interpolateToSEDAC();
		if (!options.exclude.includes("H")) await this.H_scaleGDPRastersToNational();
		
		//4. Final top-down constraint recalculation
		if (!options.exclude.includes("I")) await this.I_recalculateGDP_pcRasters();
	}
};