global.GDP_PPP_pc = class {
	static cf = `${h3}/GDP_PPP_pc/`;
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
	static intermediate_ols_rasters_folder = `${this.cf}2.OLS_PPP_pc_rasters/`;
	static intermediate_pc_estimates_folder = `${this.cf}3.PPP_pc_estimates/`;
	static intermediate_gdp_ppp_folder = `${this.cf}/4.PPP_rasters/`;
	static intermediate_gdp_ppp_scaled_to_global = `${this.cf}/5.scaled_to_global/`;
	static intermediate_gdp_ppp_interpolated = `${this.cf}/6.interpolated/`;
	static intermediate_gdp_ppp_scaled_to_national = `${this.cf}/7.scaled_to_national/`;
	static output_gdp_ppp_pc_folder = `${this.cf}/8.GDP_PPP_pc_rasters/`;
	
	//HYDE; Stadestér formatters
	static hf = () => `${landuse_HYDE.bf}/rasters/`;
	static hf1 = (y) => landuse_HYDE._getHYDEYearName(y);
	static sf = () => population_Stadester_Legacy;
	
	static async A_generateGDP_pcRasters () {
		//Declare local instance variables
		let hyde_years = landuse_HYDE.sorted_hyde_years;
		
		for (let i = 0; i < hyde_years.length; i++) {
			let local_gdp_file_path = `${GDP_PPP.intermediate_scaled_to_global}GDP_PPP_${hyde_years[i]}.png`;
			let local_popc_file_path = `${population_Stadester_Legacy.input_popc_folder}stadester_population_${hyde_years[i]}.png`;
			
			if (fs.existsSync(local_gdp_file_path) && fs.existsSync(local_popc_file_path)) {
				let local_gdp_raster = GeoPNG.loadNumberRasterImage(local_gdp_file_path, {
					format: "float32"
				});
				let local_popc_raster = GeoPNG.loadNumberRasterImage(local_popc_file_path, {
					format: "int32"
				});
				let local_output_file_path = `${this.input_gdp_pc_folder}GDP_PPP_pc_${hyde_years[i]}.png`;
				
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
		let input_file_path = `${this.input_gdp_pc_folder}/GDP_PPP_pc_${year}.png`;
		
		//Return statement
		return Statistics.loadOLSCovariates(input_file_path, {
			utility_format: "float32",
			
			covariates_obj: this.input_covariates_obj(),
			formatting_parameters: [year]
		});
	}
	
	static async B_trainGDP_PPP_pcModel (arg0_year, arg1_options) {
		//Convert from parameters
		let year = parseInt(arg0_year);
		let options = (arg1_options) ? arg1_options : {};
		
		//Initialise options
		if (!options.lambda) options.lambda = 1e6;
		if (!options.key) options.key = year.toString();
		if (!options.weighting_function) options.weighting_function = (value) => Math.abs(value);
		
		//Declare local instance variables
		let covariates_obj = await this.B_loadCovariates(year);
		let output_file_path =  `${this.intermediate_ols_folder}/OLS_GDP_PPP_pc_${year}.json`;
		
		//Return statement
		return Statistics.trainOLSModel(output_file_path, covariates_obj, options);
	}
	
	static async B_trainGDP_PPP_pcModels (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Declare local instance variables
		let years = landuse_HYDE.sorted_hyde_years;
		
		//Iterate over all years
		for (let i = 0; i < years.length; i++)
			await this.B_trainGDP_PPP_pcModel(years[i], {
				...options,
				key: years[i]
			});
	}
	
	static async C_generateOLS_GDP_PPP_pcRasters () {
		//Declare local instance variables
		let landarea_raster = GeoPNG.loadNumberRasterImage(metadata_HYDE.input_raster_land_area, {
			format: "int32"
		});
		let years = landuse_HYDE.sorted_hyde_years;
		
		//Iterate over all years
		for (let i = 0; i < years.length; i++) {
			let local_input_path = `${this.intermediate_ols_folder}OLS_GDP_PPP_pc_${years[i]}.json`;
			if (!fs.existsSync(local_input_path)) {
				console.warn(`- Could not load OLS for ${local_input_path}.`);
				continue;
			}
			let local_output_path = `${this.intermediate_ols_rasters_folder}OLS_GDP_PPP_pc_${years[i]}.png`;
			
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
	
	static async D_normaliseGDP_PPP_pcRasters () {
		//Declare local instance variables
		let years = landuse_HYDE.sorted_hyde_years;
		let global_prev_max = 0;
		
		//Iterate over all years
		for (let i = 0; i < years.length; i++) {
			let first_pass_domain = [Infinity, -Infinity];
			let first_pass_path = `${this.input_gdp_pc_folder}GDP_PPP_pc_${years[i]}.png`;
			let first_pass_raster = GeoPNG.loadNumberRasterImage(first_pass_path, {
				format: "float32"
			});
			let second_pass_domain = [Infinity, -Infinity];
			let second_pass_path = `${this.intermediate_ols_rasters_folder}OLS_GDP_PPP_pc_${years[i]}.png`;
			let second_pass_raster = GeoPNG.loadNumberRasterImage(second_pass_path, {
				format: "float32"
			});
			
			let output_path = `${this.intermediate_pc_estimates_folder}GDP_PPP_pc_${years[i]}.png`;
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
					
					//Clamp extreme outliers: if value > 10x the previous year's max, set it to the previous max
					if (i > 0 && global_prev_max > 0)
						if (result_value > global_prev_max * 10) result_value = global_prev_max;
					
					//Track the max value for this current iteration/year
					if (result_value > current_iteration_max) current_iteration_max = result_value;
					
					return result_value;
				}
			});
			
			//Update global_prev_max for the next year in the loop
			global_prev_max = current_iteration_max;
			console.log(`- Saved ${output_path}. Max observed: ${current_iteration_max}`);
			await Blacktraffic.yield();
		}
	}
	
	static async E_generateGDP_PPPRasters () {
		//Declare local instance variables
		let years = landuse_HYDE.sorted_hyde_years;
		
		//Iterate over all years
		for (let i = 0; i < years.length; i++) {
			let pc_path = `${this.intermediate_pc_estimates_folder}GDP_PPP_pc_${years[i]}.png`;
			let pop_path = `${population_Stadester_Legacy.input_popc_folder}stadester_population_${years[i]}.png`;
			let output_path = `${this.intermediate_gdp_ppp_folder}GDP_PPP_${years[i]}.png`;
			
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
				console.log(`- Saved total GDP PPP: ${output_path}`);
				await Blacktraffic.yield();
			}
		}
	}
	
	static async F_scaleGDP_PPPRastersToGlobal () {
		//Return statement; Reusing logic from GDP_PPP core class
		return GDP_PPP.B_scaleGDP_PPPRastersToGlobal(
			this.intermediate_gdp_ppp_folder,
			this.intermediate_gdp_ppp_scaled_to_global
		);
	}
	
	static async G_interpolateToSEDAC () {
		//Declare local instance variables
		let sedac_domain = [1800, 1990];
		let sedac1_domain = [1800, 1950];
		let sedac2_domain = [1950, 1990];
		let hyde_years = landuse_HYDE.sorted_hyde_years;
		let to_path = `${GDP_PPP_SEDAC.bf}GDP_PPP_1990.png`;
		let year_gap = sedac_domain[1] - sedac_domain[0];
		let year_gap2 = sedac2_domain[1] - sedac2_domain[0];
		let world_gdp_obj = GDP_PPP.getWorldGDP_PPPObject();
		
		if (!fs.existsSync(this.intermediate_gdp_ppp_interpolated))
			fs.mkdirSync(this.intermediate_gdp_ppp_interpolated, { recursive: true });
		
		//Iterate over all landuse_HYDE.hyde_years
		for (let i = 0; i < hyde_years.length; i++) {
			let current_year = hyde_years[i];
			let local_from_path = `${this.intermediate_gdp_ppp_scaled_to_global}GDP_PPP_${current_year}.png`;
			let local_output_path = `${this.intermediate_gdp_ppp_interpolated}GDP_PPP_${current_year}.png`;
			
			if (current_year < sedac_domain[0]) {
				if (fs.existsSync(local_from_path)) {
					fs.copyFileSync(local_from_path, local_output_path);
					console.log(`- Copying global scaled GDP PPP directly for year ${current_year}.`);
				}
			} else if (current_year >= sedac_domain[0] && current_year < sedac_domain[1]) {
				let fraction = (current_year - sedac_domain[0])/year_gap;
				
				if (current_year < sedac1_domain[1]) {
					GeoPNG.linearInterpolation(local_from_path, to_path, local_output_path, {
						format: "float32",
						fraction,
						upper_value_threshold: 256
					});
					console.log(`- (1st-pass) Finished interpolating ${local_from_path} to SEDAC 1990.`);
				} else {
					let threshold_fraction = (current_year - sedac2_domain[0])/year_gap2;
					
					GeoPNG.linearInterpolation(local_from_path, to_path, local_output_path, {
						format: "float32",
						fraction,
						threshold_fraction
					});
					console.log(`- (2nd-pass) Finished interpolating ${local_from_path} to SEDAC 1990.`);
				}
			} else if (current_year >= 1990 && current_year <= 2022) {
				let local_sedac_path = `${GDP_PPP_SEDAC.bf}GDP_PPP_${current_year}.png`;
				if (fs.existsSync(local_sedac_path)) {
					fs.copyFileSync(local_sedac_path, local_output_path);
					console.log(`- Copying SEDAC template directly for year ${current_year}.`);
				}
			} else {
				let template_path = `${GDP_PPP_SEDAC.bf}GDP_PPP_2022.png`;
				
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
					console.log(`- Created post-2022 global scaled template from SEDAC 2022 for year ${current_year}.`);
				}
			}
			await Blacktraffic.yield();
		}
	}
	
	static async H_scaleGDP_PPPRastersToNational () {
		//Declare local instance variables
		let hyde_years = landuse_HYDE.sorted_hyde_years;
		let gdp_ppp_obj = GDP_PPP.getGDP_PPPObject();
		let geocode_obj = admin_modern.getColourcodesObject();
		let geocode_raster = GeoPNG.loadImage(admin_modern.input_geocodes_raster);
		let previous_max_pc = 0;
		
		//Iterate over all hyde_years
		for (let i = 0; i < hyde_years.length; i++) {
			let current_year = hyde_years[i];
			let local_input_file_path = `${this.intermediate_gdp_ppp_interpolated}GDP_PPP_${current_year}.png`;
			if (!fs.existsSync(local_input_file_path)) continue;
			
			let local_input_raster = GeoPNG.loadNumberRasterImage(local_input_file_path, { format: "float32" });
			let local_popc_file_path = `${population_Stadester_Legacy.input_popc_folder}stadester_population_${current_year}.png`;
			let local_popc_raster = GeoPNG.loadNumberRasterImage(local_popc_file_path, { format: "int32" });
			let local_output_file = `${this.intermediate_gdp_ppp_scaled_to_national}GDP_PPP_${current_year}.png`;
			
			let local_gdp_ppp_sums = {};
			let country_stats = {};
			let current_max_pc = 0;
			let local_threshold = (previous_max_pc > 0) ? Math.min(previous_max_pc * 4, 500000) : 500000;
			
			//1. First pass: calculate raw sums per country
			for (let x = 0; x < local_input_raster.data.length; x++) {
				let byte_index = x * 4;
				let local_colour_key = `${geocode_raster.data[byte_index]},${geocode_raster.data[byte_index+1]},${geocode_raster.data[byte_index+2]}`;
				let local_geocodes = geocode_obj[local_colour_key];
				
				if (local_geocodes)
					for (let y = 0; y < local_geocodes.length; y++)
						Object.modifyValue(local_gdp_ppp_sums, local_geocodes[y], local_input_raster.data[x]);
			}
			
			//2. Set country targets
			Object.iterate(local_gdp_ppp_sums, (local_key, local_value) => {
				let local_target = gdp_ppp_obj[local_key]?.[current_year];
				country_stats[local_key] = {
					initial_scalar: (local_target) ? local_target / local_value : 1,
					outlier_gdp: 0,
					remaining_input_sum: 0,
					target_gdp: local_target || local_value
				};
			});
			
			//3. Second pass: outlier identification using 4x rolling ceiling
			for (let x = 0; x < local_input_raster.data.length; x++) {
				let byte_index = x * 4;
				let local_colour_key = `${geocode_raster.data[byte_index]},${geocode_raster.data[byte_index+1]},${geocode_raster.data[byte_index+2]}`;
				let local_geocodes = geocode_obj[local_colour_key];
				
				if (local_geocodes) {
					let local_val = local_input_raster.data[x];
					let local_pop = local_popc_raster.data[x];
					let local_stats = country_stats[local_geocodes[0]];
					
					if (local_stats) {
						let projected_pc = (local_pop > 0) ? (local_val * local_stats.initial_scalar) / local_pop : 0;
						
						if (projected_pc > local_threshold) {
							local_stats.outlier_gdp += local_threshold * local_pop;
						} else {
							local_stats.remaining_input_sum += local_val;
						}
					}
				}
			}
			
			//4. Set redistribution scalars
			Object.iterate(country_stats, (local_key, local_stats) => {
				let remaining_target = local_stats.target_gdp - local_stats.outlier_gdp;
				local_stats.final_scalar = (local_stats.remaining_input_sum > 0) ? remaining_target / local_stats.remaining_input_sum : local_stats.initial_scalar;
			});
			
			//5. Third pass: Write scaled raster and update Rolling max
			GeoPNG.saveNumberRasterImage({
				file_path: local_output_file,
				format: "float32",
				height: 2160,
				width: 4320,
				function: (local_index) => {
					let byte_index = local_index * 4;
					let local_colour_key = `${geocode_raster.data[byte_index]},${geocode_raster.data[byte_index+1]},${geocode_raster.data[byte_index+2]}`;
					let local_geocodes = geocode_obj[local_colour_key];
					let local_val = local_input_raster.data[local_index];
					let local_pop = local_popc_raster.data[local_index];
					
					if (local_geocodes) {
						let local_stats = country_stats[local_geocodes[0]];
						if (local_stats) {
							let result_gdp = local_val * local_stats.final_scalar;
							let result_pc = (local_pop > 0) ? result_gdp / local_pop : 0;
							
							if (result_pc > local_threshold) {
								return local_threshold * local_pop;
							} else {
								if (result_pc > current_max_pc) current_max_pc = result_pc;
								return result_gdp;
							}
						}
					}
					return local_val;
				}
			});
			
			previous_max_pc = current_max_pc;
			console.log(`- Finished GDP PPP ${current_year}. Healthy max PC: ${current_max_pc} (Threshold: ${local_threshold})`);
			await Blacktraffic.yield();
		}
	}
	
	static async I_recalculateGDP_PPP_pcRasters () {
		//Declare local instance variables
		let hyde_years = landuse_HYDE.sorted_hyde_years;
		let previous_max_pc = 0;
		
		for (let i = 0; i < hyde_years.length; i++) {
			let current_year = hyde_years[i];
			let total_file_path = `${this.intermediate_gdp_ppp_scaled_to_national}GDP_PPP_${current_year}.png`;
			let popc_file_path = `${population_Stadester_Legacy.input_popc_folder}stadester_population_${current_year}.png`;
			let output_file_path = `${this.output_gdp_ppp_pc_folder}GDP_PPP_pc_${current_year}.png`;
			let current_max_pc = 0;
			let local_threshold = (previous_max_pc > 0) ? Math.min(previous_max_pc * 4, 500000) : 500000;
			
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
						let local_pc = (local_pop > 0) ? total_raster.data[local_index] / local_pop : 0;
						
						if (isNaN(local_pc)) return 0;
						if (local_pc > local_threshold) return local_threshold;
						
						if (local_pc > current_max_pc) current_max_pc = local_pc;
						return local_pc;
					}
				});
				
				previous_max_pc = current_max_pc;
				console.log(`- Finalized GDP PPP pc for ${current_year}. Healthy max: ${current_max_pc}`);
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
		if (!options.exclude.includes("B")) await this.B_trainGDP_PPP_pcModels(options);
		if (!options.exclude.includes("C")) await this.C_generateOLS_GDP_PPP_pcRasters();
		if (!options.exclude.includes("D")) await this.D_normaliseGDP_PPP_pcRasters();
		
		//3. Ensemble regeneration and scaling
		if (!options.exclude.includes("E")) await this.E_generateGDP_PPPRasters();
		if (!options.exclude.includes("F")) await this.F_scaleGDP_PPPRastersToGlobal();
		if (!options.exclude.includes("G")) await this.G_interpolateToSEDAC();
		if (!options.exclude.includes("H")) await this.H_scaleGDP_PPPRastersToNational();
		
		//4. Final top-down constraint recalculation
		if (!options.exclude.includes("I")) await this.I_recalculateGDP_PPP_pcRasters();
	}
};