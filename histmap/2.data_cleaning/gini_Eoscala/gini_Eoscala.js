global.gini_Eoscala = class {
	static bf = `${h2}/gini_Eoscala/`;
	static input_covariates_obj = () => {
		//Return statement
		return { ...gini_OLS.covariates_obj };
	};
	static input_eoscala_gini_json = () => `${gini_OLS.intermediate_ols_eoscala}geomean_OLS_Eoscala.json`;
	static input_gapminder_gini_json = () => `${gini_OLS.intermediate_ols_gapminder}geomean_OLS_Gapminder.json`;
	static input_subngini_json = () => `${gini_OLS.intermediate_ols_subngini}geomean_OLS_SubNGini.json`;
	static intermediate_ols_rasters = `${this.bf}1.OLS_rasters/`;
	static intermediate_normalised_rasters = `${this.bf}2.normalised_rasters/`;
	static output_clamped_rasters = `${this.bf}3.clamped_rasters/`;
	static years = () => landuse_HYDE.sorted_hyde_years;
	
	static options = {
		//Domains for dasymetric masking
		gapminder_domain: [1800, 1990],
		subngini_domain: [1990, 2023]
	};
	
	static async A_generateOLSRasters () {
		let years = this.years();
		let base_dir = this.intermediate_ols_rasters;
		if (!fs.existsSync(base_dir)) fs.mkdirSync(base_dir, { recursive: true });
		
		for (let i = 0; i < years.length; i++) {
			let year = years[i];
			let model_path = this.input_eoscala_gini_json();
			
			if (year >= this.options.gapminder_domain[0] && year < this.options.subngini_domain[0]) {
				model_path = this.input_gapminder_gini_json();
			} else if (year >= this.options.subngini_domain[0]) {
				model_path = this.input_subngini_json();
			}
			
			let output_file_path = `${base_dir}gini_OLS_${year}.png`;
			if (fs.existsSync(output_file_path)) continue;
			
			// Load and parse the model to filter invalid coefficients
			let model_obj = JSON.parse(fs.readFileSync(model_path, "utf8"));
			let filtered_coefficients = {};
			
			Object.iterate(model_obj.coefficients, (local_key, local_value) => {
				let parsed_val = parseFloat(local_value);
				
				// Drop the covariate if its coefficient exceeds 1
				if (parsed_val < 1) {
					filtered_coefficients[local_key] = parsed_val;
				} else {
					console.warn(`- Dropped covariate ${local_key} for year ${year} because coefficient ${parsed_val} exceeds 1.`);
				}
			});
			
			model_obj.coefficients = filtered_coefficients;
			
			console.log(`Generating OLS raster for year ${year} using model ${model_path}`);
			await Statistics.generateOLSRaster(output_file_path, {
				covariates_obj: this.input_covariates_obj(),
				format: "float32",
				formatting_parameters: [year],
				model_obj: model_obj
			});
			await Blacktraffic.yield();
		}
	}
	
	static async B_normaliseOLSRasters () {
		let target_years = this.years();
		let src_dir = this.intermediate_ols_rasters;
		let dest_dir = this.intermediate_normalised_rasters;
		if (!fs.existsSync(dest_dir)) fs.mkdirSync(dest_dir, { recursive: true });
		
		// Load parent data sources
		let eoscala_points = gini_OLS.getEoscalaGiniObject();
		let gapminder_data = gini_OLS.getGapminderGiniObject();
		let subngini_data = gini_OLS.getSubNGiniObject();
		
		// Load land area mask to properly isolate land pixels from ocean
		let landarea_file = metadata_HYDE.input_raster_land_area;
		let landarea_raster = GeoPNG.loadNumberRasterImage(landarea_file, { format: "int32" });
		
		// Calculate global fallbacks in case a specific year has no direct data points
		let eoscala_global_ginis = eoscala_points.map(p => p.gini).filter(g => g !== undefined && !isNaN(g));
		let eoscala_global_min = (eoscala_global_ginis.length > 0) ? Math.min(...eoscala_global_ginis) : 0;
		let eoscala_global_max = (eoscala_global_ginis.length > 0) ? Math.max(...eoscala_global_ginis) : 1;
		
		let gapminder_global_ginis = [];
		Object.iterate(gapminder_data, (country, years_obj) => {
			Object.iterate(years_obj, (yr, val) => {
				let parsed_val = parseFloat(val);
				if (!isNaN(parsed_val)) gapminder_global_ginis.push(parsed_val);
			});
		});
		let gapminder_global_min = (gapminder_global_ginis.length > 0) ? Math.min(...gapminder_global_ginis) : 0;
		let gapminder_global_max = (gapminder_global_ginis.length > 0) ? Math.max(...gapminder_global_ginis) : 1;
		
		let subngini_global_ginis = [];
		Object.iterate(subngini_data, (region_key, years_obj) => {
			Object.iterate(years_obj, (yr, val) => {
				let parsed_val = parseFloat(val);
				if (parsed_val !== 0 && !isNaN(parsed_val)) subngini_global_ginis.push(parsed_val);
			});
		});
		let subngini_global_min = (subngini_global_ginis.length > 0) ? Math.min(...subngini_global_ginis) : 0;
		let subngini_global_max = (subngini_global_ginis.length > 0) ? Math.max(...subngini_global_ginis) : 1;
		
		// Determine the absolute bounds of human inequality across all datasets to use as a fallback anchor
		let absolute_global_min = Math.min(eoscala_global_min, gapminder_global_min, subngini_global_min);
		let absolute_global_max = Math.max(eoscala_global_max, gapminder_global_max, subngini_global_max);
		
		let gapminder_domain = this.options.gapminder_domain;
		let subngini_domain = this.options.subngini_domain;
		
		for (let i = 0; i < target_years.length; i++) {
			let local_year = target_years[i];
			let source_path = `${src_dir}gini_OLS_${local_year}.png`;
			let output_path = `${dest_dir}gini_OLS_normalised_${local_year}.png`;
			
			if (!fs.existsSync(source_path)) {
				console.warn(`Source OLS raster not found: ${source_path}`);
				continue;
			}
			
			let raw_raster = GeoPNG.loadNumberRasterImage(source_path, { format: "float32" });
			
			// Load population data to mask out uninhabited areas from Gini bounds
			let popc_info = this.input_covariates_obj()["popc_"](local_year);
			let popc_file = popc_info[0];
			let popc_format = popc_info[1];
			let popc_raster = GeoPNG.loadNumberRasterImage(popc_file, { format: popc_format });
			
			let raw_min = Infinity;
			let raw_max = -Infinity;
			let has_valid_pixels = false;
			
			for (let j = 0; j < raw_raster.data.length; j++) {
				let is_land = (landarea_raster.data[j] > 0);
				let has_pop = (popc_raster.data[j] > 0); // Exclude 0 population
				
				if (is_land && has_pop) {
					has_valid_pixels = true;
					let val = raw_raster.data[j];
					if (val < raw_min) raw_min = val;
					if (val > raw_max) raw_max = val;
				}
			}
			
			// Resolve target min/max based on the domain of the current year
			let target_min = 0;
			let target_max = 1;
			let domain_name = "Global";
			let sample_size = 0;
			
			if (local_year < gapminder_domain[0]) {
				domain_name = "Eoscala";
				let year_points = eoscala_points.filter(p => parseInt(p.year) === local_year);
				let year_ginis = year_points.map(p => p.gini).filter(g => g !== undefined && !isNaN(g));
				sample_size = year_ginis.length;
				
				target_min = (sample_size > 0) ? Math.min(...year_ginis) : eoscala_global_min;
				target_max = (sample_size > 0) ? Math.max(...year_ginis) : eoscala_global_max;
				
				if (target_min === target_max) {
					target_min = eoscala_global_min;
					target_max = eoscala_global_max;
				}
			} else if (local_year < subngini_domain[0]) {
				domain_name = "Gapminder";
				let year_ginis = [];
				Object.iterate(gapminder_data, (country, years_obj) => {
					let val = years_obj[local_year];
					if (val !== undefined && !isNaN(val)) year_ginis.push(val);
				});
				sample_size = year_ginis.length;
				
				target_min = (sample_size > 0) ? Math.min(...year_ginis) : gapminder_global_min;
				target_max = (sample_size > 0) ? Math.max(...year_ginis) : gapminder_global_max;
				
				if (target_min === target_max) {
					target_min = gapminder_global_min;
					target_max = gapminder_global_max;
				}
			} else {
				domain_name = "SubNGini";
				let year_ginis = [];
				Object.iterate(subngini_data, (region_key, years_obj) => {
					let val = parseFloat(years_obj[local_year]);
					if (val !== 0 && !isNaN(val)) year_ginis.push(val);
				});
				sample_size = year_ginis.length;
				
				target_min = (sample_size > 0) ? Math.min(...year_ginis) : subngini_global_min;
				target_max = (sample_size > 0) ? Math.max(...year_ginis) : subngini_global_max;
				
				if (target_min === target_max) {
					target_min = subngini_global_min;
					target_max = subngini_global_max;
				}
			}
			
			// Dynamic bounds expansion based on statistical confidence (sample size).
			// Uses an exponential decay (e^-N/15). 
			// If N is very low (e.g., Eoscala pre-history), bounds heavily expand towards absolute global extremes.
			// If N is high (e.g., modern Gapminder ~150 points), the bounds lock strictly to observed data.
			let uncertainty_weight = Math.exp(-sample_size / 15);
			
			target_min = target_min - ((target_min - absolute_global_min) * uncertainty_weight);
			target_max = target_max + ((absolute_global_max - target_max) * uncertainty_weight);
			
			// Sanity clamp to mathematical boundaries of Gini
			target_min = Math.max(0, target_min);
			target_max = Math.min(1, target_max);
			
			let normalised_map = new Float32Array(raw_raster.data.length);
			
			if (has_valid_pixels) {
				// Shift the dataset so that the minimum raw value maps strictly to 1.
				// This allows us to safely use natural log, expanding the lower density cluster 
				// while smoothly mapping extreme outliers without hard clamping.
				let shift = 1 - raw_min;
				let log_min = 0; // Math.log(raw_min + shift) is exactly Math.log(1) which is 0
				let log_max = Math.log(raw_max + shift);
				let log_range = log_max - log_min;
				let target_range = target_max - target_min;
				
				for (let j = 0; j < raw_raster.data.length; j++) {
					let is_land = (landarea_raster.data[j] > 0);
					let has_pop = (popc_raster.data[j] > 0);
					
					if (is_land && has_pop) {
						let raw_val = raw_raster.data[j];
						
						if (log_range === 0) {
							normalised_map[j] = target_min;
						} else {
							let log_val = Math.log(raw_val + shift);
							let fraction = (log_val - log_min) / log_range;
							normalised_map[j] = target_min + (fraction * target_range);
						}
					} else {
						normalised_map[j] = 0; // Uninhabited land / ocean
					}
				}
				
				console.log(`Normalising year ${local_year} (${domain_name}) using Logarithmic Min-Max. Limits expanded to [${target_min.toFixed(3)}, ${target_max.toFixed(3)}] (Sample size: ${sample_size})`);
			} else {
				console.log(`Skipping normalisation for year ${local_year} (no inhabited land pixels found)`);
			}
			
			GeoPNG.saveNumberRasterImage({
				file_path: output_path,
				format: "float32",
				width: 4320,
				height: 2160,
				function: (local_index) => {
					// Both ocean and zero-pop land have already been zeroed in normalised_map
					return normalised_map[local_index];
				}
			});
			
			await Blacktraffic.yield();
		}
	}
	
	static async C_clampOLSRasters () {
		let years = this.years();
		let src_dir = this.intermediate_normalised_rasters;
		let dest_dir = this.output_clamped_rasters;
		if (!fs.existsSync(dest_dir)) fs.mkdirSync(dest_dir, { recursive: true });
		
		// Load Gapminder metadata
		let gapminder_obj = gini_OLS.getGapminderGiniObject();
		let geocode_obj = admin_modern.getColourcodesObject();
		let geocode_raster = GeoPNG.loadImage(admin_modern.input_geocodes_raster);
		
		// Load SubNGini metadata
		let subngini_obj = gini_OLS.getSubNGiniObject();
		let areal_raster_path = gini_SubNGini.output_areal_raster;
		let areal_raster = GeoPNG.loadImage(areal_raster_path);
		
		for (let i = 0; i < years.length; i++) {
			let year = years[i];
			let source_path = `${src_dir}gini_OLS_normalised_${year}.png`;
			let output_path = `${dest_dir}gini_clamped_${year}.png`;
			
			if (!fs.existsSync(source_path)) {
				console.warn(`Source normalised raster not found: ${source_path}`);
				continue;
			}
			
			if (year < this.options.gapminder_domain[0]) {
				// Pre-modern domain: Already mathematically bounded by normalisation. No regional targets exist.
				console.log(`Pre-modern year ${year} already bounded. Copying directly...`);
				fs.copyFileSync(source_path, output_path);
				continue;
			}
			
			let normalised_raster = GeoPNG.loadNumberRasterImage(source_path, { format: "float32" });
			
			// Load GDP PPP data for correct income-based Gini weighting
			let gdp_info = this.input_covariates_obj()["gdp_ppp"](year);
			let gdp_file = gdp_info[0];
			let gdp_format = gdp_info[1];
			let gdp_raster = GeoPNG.loadNumberRasterImage(gdp_file, { format: gdp_format });
			
			// Load population as a fallback for zero-GDP but populated pixels (e.g. subsistence)
			let popc_info = this.input_covariates_obj()["popc_"](year);
			let popc_file = popc_info[0];
			let popc_format = popc_info[1];
			let popc_raster = GeoPNG.loadNumberRasterImage(popc_file, { format: popc_format });
			
			let target_gini_map = {};
			let getColourKeyForPixel = null;
			
			if (year >= this.options.gapminder_domain[0] && year < this.options.subngini_domain[0]) {
				// Gapminder Domain
				Object.iterate(geocode_obj, (colour_key, local_geocodes) => {
					if (local_geocodes) {
						for (let x = 0; x < local_geocodes.length; x++) {
							let country_gini = gapminder_obj[local_geocodes[x]]?.[year];
							if (country_gini !== undefined && !isNaN(country_gini)) {
								target_gini_map[colour_key] = country_gini;
								break;
							}
						}
					}
				});
				
				getColourKeyForPixel = (local_index) => {
					let byte_index = local_index * 4;
					let r = geocode_raster.data[byte_index];
					let g = geocode_raster.data[byte_index + 1];
					let b = geocode_raster.data[byte_index + 2];
					return `${r},${g},${b}`;
				};
			} else {
				// SubNGini Domain
				Object.iterate(subngini_obj, (colour_key, local_value) => {
					let region_gini = local_value?.[year];
					if (region_gini !== undefined && !isNaN(region_gini)) {
						target_gini_map[colour_key] = region_gini;
					}
				});
				
				getColourKeyForPixel = (local_index) => {
					let byte_index = local_index * 4;
					let r = areal_raster.data[byte_index];
					let g = areal_raster.data[byte_index + 1];
					let b = areal_raster.data[byte_index + 2];
					let a = areal_raster.data[byte_index + 3];
					return `${r},${g},${b},${a}`;
				};
			}
			
			// 1. Extract valid absolute bounds from the normalised raster
			let valid_min = Infinity;
			let valid_max = -Infinity;
			for (let j = 0; j < normalised_raster.data.length; j++) {
				let val = normalised_raster.data[j];
				if (val > 0) { // Ignore ocean/uninhabited mask (0)
					if (val < valid_min) valid_min = val;
					if (val > valid_max) valid_max = val;
				}
			}
			
			// Expand valid bounds if any specific target somehow exceeds them
			Object.iterate(target_gini_map, (k, target_val) => {
				if (target_val < valid_min) valid_min = target_val;
				if (target_val > valid_max) valid_max = target_val;
			});
			
			if (valid_min === Infinity) valid_min = 0;
			if (valid_max === -Infinity) valid_max = 1;
			
			let valid_range = valid_max - valid_min;
			
			// 2. Group pixels by region and map them to Logit (-∞, ∞) space
			let region_pixels = {};
			let total_pixels = normalised_raster.data.length;
			
			for (let index = 0; index < total_pixels; index++) {
				let norm_gini = normalised_raster.data[index];
				if (norm_gini === 0) continue; // Skip ocean
				
				let colour_key = getColourKeyForPixel(index);
				if (target_gini_map[colour_key] !== undefined) {
					let gdp = Math.max(0, gdp_raster.data[index]);
					let pop = Math.max(0, popc_raster.data[index]);
					
					let weight = (gdp > 0) ? gdp : (pop > 0 ? pop * 0.001 : 0);
					if (weight > 0) {
						if (!region_pixels[colour_key]) {
							region_pixels[colour_key] = { total_weight: 0, pixels: [] };
						}
						
						// Convert to 0-1 Unit scale, avoiding absolute 0 or 1 for Logit math
						let unit_gini = (valid_range > 0) ? ((norm_gini - valid_min) / valid_range) : 0.5;
						unit_gini = Math.max(0.0001, Math.min(0.9999, unit_gini));
						
						// Logit transform: ln( p / (1-p) )
						let logit_val = Math.log(unit_gini / (1 - unit_gini));
						
						region_pixels[colour_key].pixels.push({ index, weight, logit_val });
						region_pixels[colour_key].total_weight += weight;
					}
				}
			}
			
			// 3. Binary Search for the perfect Logit Shift (+/-) factor per region
			let shift_map = {};
			
			Object.iterate(region_pixels, (colour_key, data) => {
				let target = target_gini_map[colour_key];
				let target_unit = (valid_range > 0) ? ((target - valid_min) / valid_range) : 0.5;
				target_unit = Math.max(0.0001, Math.min(0.9999, target_unit));
				
				if (data.total_weight === 0) {
					shift_map[colour_key] = 0;
					return;
				}
				
				let low = -20; // Extreme shift left
				let high = 20; // Extreme shift right
				let best_shift = 0;
				
				for (let iter = 0; iter < 50; iter++) {
					let mid = (low + high) / 2;
					let weighted_sum = 0;
					
					for (let i = 0; i < data.pixels.length; i++) {
						let shifted_logit = data.pixels[i].logit_val + mid;
						// Sigmoid transform back to unit space: 1 / (1 + e^-L)
						let sigmoid_val = 1 / (1 + Math.exp(-shifted_logit));
						weighted_sum += data.pixels[i].weight * sigmoid_val;
					}
					
					let current_mean = weighted_sum / data.total_weight;
					
					// If mean is too low, we need a larger positive shift
					if (current_mean < target_unit) {
						low = mid;
					} else {
						high = mid;
					}
					best_shift = mid;
				}
				
				shift_map[colour_key] = best_shift;
			});
			
			console.log(`Clamping year ${year} using Logit (Log-Odds) adjustment. Variance preserved and asymptotically bounded to [${valid_min.toFixed(3)}, ${valid_max.toFixed(3)}]`);
			
			GeoPNG.saveNumberRasterImage({
				file_path: output_path,
				format: "float32",
				width: 4320,
				height: 2160,
				function: (local_index) => {
					let norm_gini = normalised_raster.data[local_index];
					if (norm_gini === 0) return 0; // Skip empty ocean/uninhabited land directly
					
					let colour_key = getColourKeyForPixel(local_index);
					let shift = shift_map[colour_key];
					
					if (shift !== undefined) {
						let unit_gini = (valid_range > 0) ? ((norm_gini - valid_min) / valid_range) : 0.5;
						unit_gini = Math.max(0.0001, Math.min(0.9999, unit_gini));
						
						let logit_val = Math.log(unit_gini / (1 - unit_gini));
						let shifted_logit = logit_val + shift;
						let new_unit = 1 / (1 + Math.exp(-shifted_logit));
						
						return valid_min + (new_unit * valid_range);
					}
					
					// Fallback to original if out of target mapping
					return Math.min(valid_max, Math.max(valid_min, norm_gini));
				}
			});
			
			await Blacktraffic.yield();
		}
	}
	
	static async processRasters (arg0_options) {
		let options = (arg0_options) ? arg0_options : {};
		if (!options.exclude) options.exclude = [];
		
		if (!options.exclude.includes("A")) await this.A_generateOLSRasters();
		if (!options.exclude.includes("B")) await this.B_normaliseOLSRasters();
		if (!options.exclude.includes("C")) await this.C_clampOLSRasters();
	}
};