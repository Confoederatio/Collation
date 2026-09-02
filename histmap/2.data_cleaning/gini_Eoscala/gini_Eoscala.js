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
	static intermediate_clamped_rasters = `${this.bf}3.clamped_rasters/`;
	static output_rasters = `${this.bf}4.output_rasters/`;
	static years = () => landuse_HYDE.sorted_hyde_years;
	
	static options = {
		//Domains for dasymetric masking
		gapminder_domain: [1800, 1990],
		subngini_domain: [1990, 2023],
		
		interpolate_to_gapminder: [1700, 1800],
		interpolate_to_subngini: [1950, 1990]
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
				
				if (parsed_val < 1) {
					filtered_coefficients[local_key] = parsed_val;
				} else {
					console.warn(`- Dropped covariate ${local_key} for year ${year} because coefficient ${parsed_val} exceeds 1.`);
				}
			});
			
			model_obj.coefficients = filtered_coefficients;
			
			// Fix for 2024-2025 missing covariates: cap the covariate formatting pull at 2023
			let format_year = year > 2023 ? 2023 : year;
			
			console.log(`Generating OLS raster for year ${year} using model ${model_path}`);
			await Statistics.generateOLSRaster(output_file_path, {
				covariates_obj: this.input_covariates_obj(),
				format: "float32",
				formatting_parameters: [format_year],
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
		
		let eoscala_points = gini_OLS.getEoscalaGiniObject();
		let gapminder_data = gini_OLS.getGapminderGiniObject();
		let subngini_data = gini_OLS.getSubNGiniObject();
		
		let landarea_file = metadata_HYDE.input_raster_land_area;
		let landarea_raster = GeoPNG.loadNumberRasterImage(landarea_file, { format: "int32" });
		
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
		
		let absolute_global_min = Math.min(eoscala_global_min, gapminder_global_min, subngini_global_min);
		let absolute_global_max = Math.max(eoscala_global_max, gapminder_global_max, subngini_global_max);
		
		let gapminder_domain = this.options.gapminder_domain;
		let subngini_domain = this.options.subngini_domain;
		
		for (let i = 0; i < target_years.length; i++) {
			let local_year = target_years[i];
			let source_path = `${src_dir}gini_OLS_${local_year}.png`;
			let output_path = `${dest_dir}gini_OLS_normalised_${local_year}.png`;
			
			if (!fs.existsSync(source_path)) continue;
			
			let raw_raster = GeoPNG.loadNumberRasterImage(source_path, { format: "float32" });
			
			let format_year = local_year > 2023 ? 2023 : local_year;
			let popc_info = this.input_covariates_obj()["popc_"](format_year);
			let popc_raster = GeoPNG.loadNumberRasterImage(popc_info[0], { format: popc_info[1] });
			
			let target_min = 0, target_max = 1;
			let domain_name = "Global", sample_size = 0;
			
			if (local_year < gapminder_domain[0]) {
				domain_name = "Eoscala";
				let year_points = eoscala_points.filter(p => parseInt(p.year) === local_year);
				let year_ginis = year_points.map(p => p.gini).filter(g => g !== undefined && !isNaN(g));
				sample_size = year_ginis.length;
				target_min = (sample_size > 0) ? Math.min(...year_ginis) : eoscala_global_min;
				target_max = (sample_size > 0) ? Math.max(...year_ginis) : eoscala_global_max;
				if (target_min === target_max) { target_min = eoscala_global_min; target_max = eoscala_global_max; }
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
				if (target_min === target_max) { target_min = gapminder_global_min; target_max = gapminder_global_max; }
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
				if (target_min === target_max) { target_min = subngini_global_min; target_max = subngini_global_max; }
			}
			
			// Dynamic Bounds Expansion
			let uncertainty_weight = Math.exp(-sample_size / 15);
			target_min = target_min - ((target_min - absolute_global_min) * uncertainty_weight);
			target_max = target_max + ((absolute_global_max - target_max) * uncertainty_weight);
			target_min = Math.max(0, target_min);
			target_max = Math.min(1, target_max);
			
			// --- STEP 1: GATHER VALID DATA & CALCULATE ROBUST STATISTICS ---
			let valid_pixels = [];
			let sum = 0;
			
			for (let j = 0; j < raw_raster.data.length; j++) {
				if (landarea_raster.data[j] > 0 && popc_raster.data[j] > 0) {
					valid_pixels.push(raw_raster.data[j]);
					sum += raw_raster.data[j];
				}
			}
			
			let normalised_map = new Float32Array(raw_raster.data.length);
			
			if (valid_pixels.length > 0) {
				valid_pixels.sort((a, b) => a - b);
				let N = valid_pixels.length;
				
				let mean = sum / N;
				let sq_sum = 0;
				for (let j = 0; j < N; j++) sq_sum += Math.pow(valid_pixels[j] - mean, 2);
				let std = Math.sqrt(sq_sum / N);
				
				// Tukey's Fences (Q1, Q3, and Interquartile Range)
				let Q1 = valid_pixels[Math.floor(N * 0.25)];
				let Q3 = valid_pixels[Math.floor(N * 0.75)];
				let IQR = Q3 - Q1;
				
				// Scale alpha defines the strict linear bulk bounds. (Fallback to STD if IQR is completely flat)
				let alpha = (IQR > 1e-5) ? IQR : ((std > 1e-5) ? std : 0.01);
				
				let T_lower = Q1 - (1.5 * alpha);
				let T_upper = Q3 + (1.5 * alpha);
				
				// --- STEP 2: C1-CONTINUOUS LOG-TAIL REGULARISATION ---
				// This guarantees a perfectly smooth curve that never flatlines at a hard ceiling.
				const regularise = (x) => {
					if (x > T_upper) {
						// Upper Outlier: Logarithmic Compression
						return T_upper + alpha * Math.log(1 + ((x - T_upper) / alpha));
					} else if (x < T_lower) {
						// Lower Outlier: Logarithmic Compression
						return T_lower - alpha * Math.log(1 + ((T_lower - x) / alpha));
					} else {
						// The Bulk (99% of data): 100% Linear variance preservation
						return x;
					}
				};
				
				// Because regularise(x) is strictly monotonically increasing, 
				// the min/max of the raw array guarantees the true min/max of the regularised space.
				let raw_min = valid_pixels[0];
				let raw_max = valid_pixels[N - 1];
				
				let reg_min = regularise(raw_min);
				let reg_max = regularise(raw_max);
				let reg_range = reg_max - reg_min;
				let target_range = target_max - target_min;
				
				for (let j = 0; j < raw_raster.data.length; j++) {
					if (landarea_raster.data[j] > 0 && popc_raster.data[j] > 0) {
						let x = raw_raster.data[j];
						let x_reg = regularise(x);
						
						// Standard Linear Min-Max using the newly un-bunched, regularised data
						if (reg_range === 0) {
							normalised_map[j] = target_min;
						} else {
							normalised_map[j] = target_min + ((x_reg - reg_min) / reg_range) * target_range;
						}
					} else {
						normalised_map[j] = 0;
					}
				}
				
				console.log(`Normalising year ${local_year} (${domain_name}) using Log-Tail Regularisation. Un-bunched limits mapped to [${target_min.toFixed(3)}, ${target_max.toFixed(3)}].`);
			} else {
				console.log(`Skipping normalisation for year ${local_year} (no inhabited land pixels found)`);
			}
			
			GeoPNG.saveNumberRasterImage({
				file_path: output_path,
				format: "float32",
				width: 4320,
				height: 2160,
				function: (local_index) => {
					return normalised_map[local_index];
				}
			});
			
			await Blacktraffic.yield();
		}
	}
	
	static async C_clampOLSRasters () {
		let years = this.years();
		let src_dir = this.intermediate_normalised_rasters;
		let dest_dir = this.intermediate_clamped_rasters;
		if (!fs.existsSync(dest_dir)) fs.mkdirSync(dest_dir, { recursive: true });
		
		let gapminder_obj = gini_OLS.getGapminderGiniObject();
		let geocode_obj = admin_modern.getColourcodesObject();
		let geocode_raster = GeoPNG.loadImage(admin_modern.input_geocodes_raster);
		
		let subngini_obj = gini_OLS.getSubNGiniObject();
		let areal_raster_path = gini_SubNGini.output_areal_raster;
		let areal_raster = GeoPNG.loadImage(areal_raster_path);
		
		for (let i = 0; i < years.length; i++) {
			let year = years[i];
			let source_path = `${src_dir}gini_OLS_normalised_${year}.png`;
			let output_path = `${dest_dir}gini_clamped_${year}.png`;
			
			if (!fs.existsSync(source_path)) continue;
			
			if (year < this.options.gapminder_domain[0]) {
				console.log(`Pre-modern year ${year} already bounded. Copying directly...`);
				fs.copyFileSync(source_path, output_path);
				continue;
			}
			
			let normalised_raster = GeoPNG.loadNumberRasterImage(source_path, { format: "float32" });
			
			let format_year = year > 2023 ? 2023 : year;
			
			let gdp_info = this.input_covariates_obj()["gdp_ppp"](format_year);
			let gdp_file = gdp_info[0];
			let gdp_format = gdp_info[1];
			let gdp_raster = GeoPNG.loadNumberRasterImage(gdp_file, { format: gdp_format });
			
			let popc_info = this.input_covariates_obj()["popc_"](format_year);
			let popc_file = popc_info[0];
			let popc_format = popc_info[1];
			let popc_raster = GeoPNG.loadNumberRasterImage(popc_file, { format: popc_format });
			
			let target_gini_map = {};
			let getColourKeyForPixel = null;
			
			if (year >= this.options.gapminder_domain[0] && year < this.options.subngini_domain[0]) {
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
			
			let valid_min = Infinity;
			let valid_max = -Infinity;
			for (let j = 0; j < normalised_raster.data.length; j++) {
				let val = normalised_raster.data[j];
				if (val > 0) {
					if (val < valid_min) valid_min = val;
					if (val > valid_max) valid_max = val;
				}
			}
			
			Object.iterate(target_gini_map, (k, target_val) => {
				if (target_val < valid_min) valid_min = target_val;
				if (target_val > valid_max) valid_max = target_val;
			});
			
			if (valid_min === Infinity) valid_min = 0;
			if (valid_max === -Infinity) valid_max = 1;
			let valid_range = valid_max - valid_min;
			
			let region_pixels = {};
			let total_pixels = normalised_raster.data.length;
			
			for (let index = 0; index < total_pixels; index++) {
				let norm_gini = normalised_raster.data[index];
				if (norm_gini === 0) continue;
				
				let colour_key = getColourKeyForPixel(index);
				if (target_gini_map[colour_key] !== undefined) {
					let gdp = Math.max(0, gdp_raster.data[index]);
					let pop = Math.max(0, popc_raster.data[index]);
					
					let weight = (gdp > 0) ? gdp : (pop > 0 ? pop * 0.001 : 0);
					if (weight > 0) {
						if (!region_pixels[colour_key]) {
							region_pixels[colour_key] = { total_weight: 0, weighted_sum_unit: 0, pixels: [] };
						}
						
						let unit_gini = (valid_range > 0) ? ((norm_gini - valid_min) / valid_range) : 0.5;
						unit_gini = Math.max(0.0001, Math.min(0.9999, unit_gini));
						
						let logit_val = Math.log(unit_gini / (1 - unit_gini));
						
						region_pixels[colour_key].pixels.push({ index, weight, logit_val });
						region_pixels[colour_key].total_weight += weight;
						region_pixels[colour_key].weighted_sum_unit += (weight * unit_gini);
					}
				}
			}
			
			let transform_map = {};
			
			Object.iterate(region_pixels, (colour_key, data) => {
				let target = target_gini_map[colour_key];
				let target_unit = (valid_range > 0) ? ((target - valid_min) / valid_range) : 0.5;
				target_unit = Math.max(0.0001, Math.min(0.9999, target_unit));
				
				if (data.total_weight === 0) return;
				
				let current_unit = data.weighted_sum_unit / data.total_weight;
				current_unit = Math.max(0.0001, Math.min(0.9999, current_unit));
				
				let var_old = current_unit * (1 - current_unit);
				let var_target = target_unit * (1 - target_unit);
				
				let alpha = var_old / var_target;
				alpha = Math.max(1.0, Math.min(10.0, alpha)); // Strict Non-Compression Rule keeps variance robust
				
				let low = -20;
				let high = 20;
				let best_shift = 0;
				
				for (let iter = 0; iter < 50; iter++) {
					let mid = (low + high) / 2;
					let weighted_sum = 0;
					
					for (let i = 0; i < data.pixels.length; i++) {
						let scaled_logit = data.pixels[i].logit_val * alpha;
						let shifted_logit = scaled_logit + mid;
						
						let sigmoid_val = 1 / (1 + Math.exp(-shifted_logit));
						weighted_sum += data.pixels[i].weight * sigmoid_val;
					}
					
					let current_mean = weighted_sum / data.total_weight;
					
					if (current_mean < target_unit) {
						low = mid;
					} else {
						high = mid;
					}
					best_shift = mid;
				}
				
				transform_map[colour_key] = { alpha: alpha, shift: best_shift };
			});
			
			console.log(`Clamping year ${year} using Strict Variance-Preserving Logit adjustment. Amplitude guaranteed >= original.`);
			
			GeoPNG.saveNumberRasterImage({
				file_path: output_path,
				format: "float32",
				width: 4320,
				height: 2160,
				function: (local_index) => {
					let norm_gini = normalised_raster.data[local_index];
					if (norm_gini === 0) return 0;
					
					let colour_key = getColourKeyForPixel(local_index);
					let transform = transform_map[colour_key];
					
					if (transform !== undefined) {
						let unit_gini = (valid_range > 0) ? ((norm_gini - valid_min) / valid_range) : 0.5;
						unit_gini = Math.max(0.0001, Math.min(0.9999, unit_gini));
						
						let logit_val = Math.log(unit_gini / (1 - unit_gini));
						
						let shifted_logit = (logit_val * transform.alpha) + transform.shift;
						let new_unit = 1 / (1 + Math.exp(-shifted_logit));
						
						return valid_min + (new_unit * valid_range);
					}
					
					return Math.min(valid_max, Math.max(valid_min, norm_gini));
				}
			});
			
			await Blacktraffic.yield();
		}
	}
	
	static async D_interpolateRasters (arg0_options = {}) {
		let options = arg0_options;
		let years = this.years();
		let src_dir = this.intermediate_clamped_rasters;
		let dest_dir = this.output_rasters;
		
		console.log(`[D_interpolateRasters] Generating final time-series...`);
		if (!fs.existsSync(dest_dir)) fs.mkdirSync(dest_dir, { recursive: true });
		
		let gapminder_interp = this.options.interpolate_to_gapminder;
		let subngini_interp = this.options.interpolate_to_subngini;
		
		let gapminder_gap = gapminder_interp[1] - gapminder_interp[0];
		let subngini_gap = subngini_interp[1] - subngini_interp[0];
		
		// This strictly prepares the brushed target ONLY for the 1800 Gapminder endpoint.
		const getBrushedGapminderTarget = async (year) => {
			let clamped_path = `${src_dir}gini_clamped_${year}.png`;
			let smoothed_path = `${src_dir}gini_clamped_${year}_brushed.png`;
			
			if (!fs.existsSync(clamped_path)) {
				console.error(`[ERROR] Missing clamped source: ${clamped_path}`);
				return null;
			}
			
			if (!fs.existsSync(smoothed_path)) {
				console.log(`- Synthesizing Population-Masked Brush for Gapminder Target (${year}) ...`);
				try {
					let gapminder_mask = GeoPNG.loadImage(admin_modern.input_geocodes_raster);
					let raw_target = GeoPNG.loadNumberRasterImage(clamped_path, { format: "float32" });
					let format_year = year > 2023 ? 2023 : year;
					let popc_info = this.input_covariates_obj()["popc_"](format_year);
					let pop_raster = GeoPNG.loadNumberRasterImage(popc_info[0], { format: popc_info[1] });
					
					let brushed_data = GeoPNG.dasymetricBlur({
						mask_data: gapminder_mask.data,
						pop_data: pop_raster.data,
						target_data: raw_target.data,
						
						height: raw_target.height,
						width: raw_target.width,
						radius: 64
					});
					
					GeoPNG.saveNumberRasterImage({
						file_path: smoothed_path,
						format: "float32",
						width: raw_target.width,
						height: raw_target.height,
						function: (idx) => brushed_data[idx]
					});
				} catch (e) {
					console.error(`[ERROR] Brush synthesis failed for ${year}:`, e);
					return null;
				}
			}
			return smoothed_path;
		};
		
		// 1. Fetch brushed target for 1800.
		let gapminder_target_path = await getBrushedGapminderTarget(gapminder_interp[1]);
		
		// 2. The SubNGini target is untouched (raw clamped).
		let subngini_target_path = `${src_dir}gini_clamped_${subngini_interp[1]}.png`;
		
		if (!gapminder_target_path || !fs.existsSync(subngini_target_path)) {
			console.error(`[ERROR] Critical endpoints missing. Aborting interpolation.`);
			return;
		}
		
		for (let i = 0; i < years.length; i++) {
			let year = years[i];
			let source_path = `${src_dir}gini_clamped_${year}.png`;
			let output_path = `${dest_dir}gini_${year}.png`;
			
			if (fs.existsSync(output_path) && !options.overwrite) continue;
			if (!fs.existsSync(source_path)) continue;
			
			try {
				// Eoscala -> Gapminder (Target is BRUSHED to prevent 1800 borders bleeding back into 1760)
				if (year >= gapminder_interp[0] && year < gapminder_interp[1]) {
					let fraction = (year - gapminder_interp[0]) / gapminder_gap;
					console.log(`- [Interpolating] ${year} Eoscala -> Gapminder [Phase: ${fraction.toFixed(3)}]`);
					
					GeoPNG.linearInterpolation(source_path, gapminder_target_path, output_path, {
						format: "float32",
						fraction: fraction,
						lower_value_threshold: 0,
						threshold_fraction: 0
					});
					
					// Gapminder -> SubNGini (Standard unbrushed interpolation)
				} else if (year >= subngini_interp[0] && year < subngini_interp[1]) {
					let fraction = (year - subngini_interp[0]) / subngini_gap;
					console.log(`- [Interpolating] ${year} Gapminder -> SubNGini [Phase: ${fraction.toFixed(3)}]`);
					
					GeoPNG.linearInterpolation(source_path, subngini_target_path, output_path, {
						format: "float32",
						fraction: fraction,
						lower_value_threshold: 0,
						threshold_fraction: 0
					});
					
					// Static Domains (1940, 2020, <1700, etc.) are purely copied directly
				} else {
					console.log(`- [Copying] Final processed format for ${year}`);
					fs.copyFileSync(source_path, output_path);
				}
			} catch (e) {
				console.error(`[ERROR] Pass failed for year ${year}:`, e);
			}
			
			await Blacktraffic.yield();
		}
		
		console.log(`[D_interpolateRasters] Final Interpolation Pass Complete.`);
	}
	
	static async processRasters (arg0_options) {
		let options = (arg0_options) ? arg0_options : {};
		if (!options.exclude) options.exclude = [];
		
		if (!options.exclude.includes("A")) await this.A_generateOLSRasters();
		if (!options.exclude.includes("B")) await this.B_normaliseOLSRasters();
		if (!options.exclude.includes("C")) await this.C_clampOLSRasters();
		if (!options.exclude.includes("D")) await this.D_interpolateRasters({ overwrite: true });
	}
};