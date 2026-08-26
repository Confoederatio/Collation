//Initialise functions
{
	if (!global.GDP_PPP_SEDAC) global.GDP_PPP_SEDAC = {};
	
	global.GDP_PPP_SEDAC = class {
		static bf = `${h1}/GDP_PPP_SEDAC/`;
		static intermediate_folder = `${h2}/GDP_PPP_SEDAC/`;
		static intermediate_ols_folder = `${h2}/GDP_PPP_SEDAC/OLS/`;
		static years = Array.getFilledDomain(1990, 2022);
		
		//Hyde formatters
		static hf = () => `${landuse_HYDE.bf}/rasters/`;
		static hf1 = (y) => landuse_HYDE._getHYDEYearName(y);
		static covariates_obj = {
			//LU (Land Use)
			"conv_rangeland": (y) => [`${this.hf()}/conv_rangeland${this.hf1(y)}_number.png`, "float32"],
			"cropland": (y) => [`${this.hf()}/cropland${this.hf1(y)}_number.png`, "float32"],
			"grazing": (y) => [`${this.hf()}/grazing${this.hf1(y)}_number.png`, "float32"],
			"ir_norice": (y) => [`${this.hf()}/ir_norice${this.hf1(y)}_number.png`, "float32"],
			"ir_rice": (y) => [`${this.hf()}/ir_rice${this.hf1(y)}_number.png`, "float32"],
			"pasture": (y) => [`${this.hf()}/pasture${this.hf1(y)}_number.png`, "float32"],
			"rangeland": (y) => [`${this.hf()}/rangeland${this.hf1(y)}_number.png`, "float32"],
			"rf_norice": (y) => [`${this.hf()}/rf_norice${this.hf1(y)}_number.png`, "float32"],
			"rf_rice": (y) => [`${this.hf()}/rf_rice${this.hf1(y)}_number.png`, "float32"],
			"shifting": (y) => [`${this.hf()}/shifting${this.hf1(y)}_number.png`, "float32"],
			"tot_irri": (y) => [`${this.hf()}/tot_irri${this.hf1(y)}_number.png`, "float32"],
			"tot_rainfed": (y) => [`${this.hf()}/tot_rainfed${this.hf1(y)}_number.png`, "float32"],
			"tot_rice": (y) => [`${this.hf()}/tot_rice${this.hf1(y)}_number.png`, "float32"],
			
			//POP (Demographics)
			"popc_": (y) => [`${this.hf()}/popc_${this.hf1(y)}_number.png`, "float32"],
			"popd_": (y) => [`${this.hf()}/popd_${this.hf1(y)}_number.png`, "float32"],
			"rurc_": (y) => [`${this.hf()}/rurc_${this.hf1(y)}_number.png`, "float32"],
			"uopp_": (y) => [`${this.hf()}/uopp_${this.hf1(y)}_number.png`, "float32"],
			"urbc_": (y) => [`${this.hf()}/urbc_${this.hf1(y)}_number.png`, "float32"]
		};
		
		/**
		 * Returns a PNG array after converting GDP (PPP) 2017$100s from .geotiff to .png.
		 *
		 * @returns {Array<Object>}
		 */
		static async A_convertToPNGs () {
			//Return statement
			return GeoTIFF.convertToPNGs(`${GDP_PPP_SEDAC.bf}/GDP_PPP_1990_2022.tif`, `${GDP_PPP_SEDAC.bf}/GDP_PPP`, {
				format: "float32",
				years: GDP_PPP_SEDAC.years
			});
		}
		
		static async B_loadCovariates (arg0_year) {
			//Convert from parameters
			let year = arg0_year;
			
			//Declare local instance variables
			let input_file_path = `${this.bf}/GDP_PPP_${year}.png`;
			
			//Return statement
			return Statistics.loadOLSCovariates(input_file_path, {
				utility_format: "float32",
				
				covariates_obj: this.covariates_obj,
				formatting_parameters: [year]
			});
		}
		
		static async C_trainGDP_PPPModel (arg0_year, arg1_options) {
			//Convert from parameters
			let year = parseInt(arg0_year);
			let options = (arg1_options) ? arg1_options : {};
			
			//Initialise options
			if (!options.lambda) options.lambda = 1e11; //x100 from Eoscala 1.3, since it is no longer $100s.
			if (!options.key) options.key = year.toString();
			
			//Declare local instance variables
			let covariates_obj = await this.B_loadCovariates(year);
			let output_file_path =  `${this.intermediate_ols_folder}/OLS_GDP_PPP_${year}.json`;
			
			//Return statement
			return Statistics.trainOLSModel(output_file_path, covariates_obj, options);
		}
		
		static async C_trainGDP_PPPModels (arg0_options) {
			//Convert from parameters
			let options = (arg0_options) ? arg0_options : {};
			
			//Iterate over all years
			for (let i = 0; i < this.years.length; i++)
				await this.C_trainGDP_PPPModel(this.years[i], {
					...options,
					key: this.years[i]
				});
		}
		
		static async D_geomeanGDP_PPPModel (arg0_prefix) {
			//Convert from parameters
			let prefix = (arg0_prefix) ? arg0_prefix : "OLS_GDP_PPP_";
			
			//Declare local instance variables
			let all_coefficients = {};
			let raw_coefficients = {};
			
			//Read all JSON files in directory
			let all_input_files = await File.getAllFiles(this.intermediate_ols_folder);
			
			//Iterate over all_input_files
			for (let i = 0; i < all_input_files.length; i++)
				if (all_input_files[i].endsWith(".json")) {
					let local_split_path = all_input_files[i].split(/[/\\]/);
					let local_file_name = local_split_path[local_split_path.length - 1];
					
					if (local_file_name.startsWith(prefix)) {
						let rawdata = JSON.parse(fs.readFileSync(all_input_files[i], "utf8"));
						let { coefficients } = rawdata;
						
						//Aggregate coefficients for geometric mean calculation
						for (let key in coefficients) {
							if (!all_coefficients[key]) all_coefficients[key] = [];
							if (!raw_coefficients[key]) raw_coefficients[key] = [];
							all_coefficients[key].push(coefficients[key]);
							raw_coefficients[key].push(coefficients[key]);
						}
					}
				}
			
			//Iterate over all_coefficients; compute geometric mean for each coefficient
			let hybrid_coefficients = {};
			
			for (let key in all_coefficients)
				hybrid_coefficients[key] = Math.weightedGeometricMean(all_coefficients[key]);
			
			let output_data = {
				coefficients: hybrid_coefficients,
				raw_coefficients
			};
			let output_path = `${this.intermediate_ols_folder}/geomean_${prefix.split("_").join(" ").trim().split(" ").join("_")}.json`;
			
			fs.writeFileSync(output_path, JSON.stringify(output_data, null, 2));
			console.log(`HYDE-SEDAC weighted geometric mean calculated and saved to: ${output_path}`);
			
			//Return statement
			return output_data;
		}
		
		static async E_processGDP_PPPModel (arg0_options) {
			//Convert from parameters
			let options = (arg0_options) ? arg0_options : {};
			
			//Calculate geomean base model
			try { await this.D_geomeanGDP_PPPModel("OLS_GDP_PPP_"); } catch (e) { console.error(e); }
			
			//Declare local instance variables
			let all_hyde_keys = Object.keys(landuse_HYDE.hyde_dictionary);
			let hyde_folder = `${landuse_HYDE.bf}/rasters/`;
			let processed_model = JSON.parse(fs.readFileSync(`${this.intermediate_ols_folder}/geomean_OLS_GDP_PPP.json`, "utf8"));
			let years = this.years;
			
			//Ensure all coefficients are positive
			let all_coefficients = Object.keys(processed_model.coefficients);
			
			for (let i = 0; i < all_coefficients.length; i++)
				processed_model.coefficients[all_coefficients[i]] = Math.abs(processed_model.coefficients[all_coefficients[i]]);
			
			//Iterate over all years
			for (let i = 0; i < years.length; i++) try {
				let local_year = years[i];
				console.log(`Processing HYDE-SEDAC geomean base adjusted model for ${local_year} ..`);
				
				let local_file_path = `${this.bf}/GDP_PPP_${local_year}.png`;
				let local_hyde_images = {};
				let total_logs = {};
				let valid_hyde_keys = [];
				
				for (let x = 0; x < all_hyde_keys.length; x++) {
					let key = all_hyde_keys[x];
					console.log(`- Processing HYDE key: ${key} ..`);
					try {
						let local_year_string = landuse_HYDE._getHYDEYearName(local_year);
						local_hyde_images[key] = GeoPNG.loadNumberRasterImage(`${hyde_folder}/${key}${local_year_string}_number.png`, {
							format: "float32"
						});
						valid_hyde_keys.push(key);
					} catch (e) {
						console.warn(`- [WARN] Missing HYDE raster for ${key} in ${local_year}. Filtering out key.`);
					}
				}
				
				let local_sedac_image = GeoPNG.loadNumberRasterImage(local_file_path, {
					format: "float32"
				});
				
				//Guard clause if no valid_hyde_keys present
				if (valid_hyde_keys.length === 0) {
					console.warn(`- [WARN] No HYDE keys for this year! Skipping year.`);
					continue;
				}
				
				//Iterate over all pixels
				console.log(`- Processing weights (bidirectional weighted average adjustment) ..`);
				let pixel_count = local_sedac_image.width * local_sedac_image.height;
				
				for (let x = 0; x < pixel_count; x++) {
					//Compute predicted_value based on HYDE stocks
					let predicted_value = 0;
					let total_weight = 0;
					
					for (let k = 0; k < valid_hyde_keys.length; k++) {
						let key = valid_hyde_keys[k];
						let hyde_value = local_hyde_images[key].data[x] || 0;
						if (isNaN(hyde_value)) hyde_value = 0;
						
						let coefficient = processed_model.coefficients[key] ?? 1;
						if (isNaN(coefficient)) coefficient = 1;
						
						let weighted_contribution = hyde_value * coefficient;
						
						predicted_value += weighted_contribution;
						total_weight += hyde_value;
						
						if (options.debug && hyde_value > 0) {
							total_logs[key] = total_logs[key] || 0;
							if (total_logs[key] < 100)
								console.log(`- HYDE: Pixel ${x}: ${key}: Hyde value: ${hyde_value}, Coefficient: ${coefficient}, Weighted contribution: ${weighted_contribution}`);
						}
					}
					
					let observed_value = local_sedac_image.data[x] || 0;
					if (isNaN(observed_value)) observed_value = 0;
					
					let residual = observed_value - predicted_value;
					let correction_factor = predicted_value !== 0 ? residual / predicted_value : 0;
					
					//Adjust coefficients proportionally based on each category's weight in that pixel
					if (total_weight > 0)
						for (let k = 0; k < valid_hyde_keys.length; k++) {
							let key = valid_hyde_keys[k];
							let hyde_value = local_hyde_images[key].data[x] || 0;
							if (isNaN(hyde_value)) hyde_value = 0;
							
							if (hyde_value === 0) continue;
							
							let local_coefficient = processed_model.coefficients[key];
							let weight_fraction = hyde_value / total_weight;
							let update_amount = local_coefficient * correction_factor * weight_fraction;
							
							if (!(correction_factor < 0 && local_coefficient < 1)) {
								if (options.debug) {
									total_logs[key] = total_logs[key] || 0;
									if (total_logs[key] < 100) {
										total_logs[key]++;
										console.log(`- SEDAC Adj: Pixel ${x}: ${key}, Update Amount: ${update_amount}, Weight Fraction: ${weight_fraction}, Residual: ${residual}, Correction Factor: ${correction_factor}`);
									}
								}
								processed_model.coefficients[key] += (isNaN(update_amount) ? 0 : update_amount);
							}
						}
				}
				
				console.log(`- New coefficients:`, processed_model.coefficients);
			} catch (e) {
				console.error(`E_processGDP_PPPModel(): Error when parsing year:`);
				console.error(e);
			}
			
			//Save adjusted coefficients
			let output_file_path = `${this.intermediate_ols_folder}/processed_base_model.json`;
			fs.writeFileSync(output_file_path, JSON.stringify(processed_model, null, 2));
			console.log(`Processed model data saved successfully in ${output_file_path}.`);
			
			//Return statement
			return processed_model;
		}
		
		static async processRasters (arg0_options) {
			//Convert from parameters
			let options = (arg0_options) ? arg0_options : {};
			
			//Initialise options
			if (!options.exclude) options.exclude = [];
			
			//1. Convert to PNGs
			if (!options.exclude.includes("A")) await this.A_convertToPNGs();
			
			//2. Train individual yearly OLS models
			if (!options.exclude.includes("C")) await this.C_trainGDP_PPPModels(options);
			
			//3. Compute geomean & adjust weights across full domain
			if (!options.exclude.includes("E")) await this.E_processGDP_PPPModel(options);
		}
	};
}