global.gini_Eoscala = class {
	static bf = `${h1}/gini_Eoscala/`;
	static input_covariates_obj = () => {
		//Return statement
		return { ...gini_OLS.covariates_obj };
	};
	static input_eoscala_gini_json = `${gini_OLS.intermediate_ols_eoscala}geomean_OLS_Eoscala.json`;
	static input_gapminder_gini_json = `${gini_OLS.intermediate_ols_gapminder}geomean_OLS_Gapminder.json`;
	static input_subngini_json = `${gini_OLS.intermediate_ols_subngini}geomean_OLS_SubNGini.json`;
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
			let model_path = this.input_eoscala_gini_json;
			
			if (year >= this.options.gapminder_domain[0] && year < this.options.subngini_domain[0]) {
				model_path = this.input_gapminder_gini_json;
			} else if (year >= this.options.subngini_domain[0]) {
				model_path = this.input_subngini_json;
			}
			
			let output_file_path = `${base_dir}gini_OLS_${year}.png`;
			
			console.log(`Generating OLS raster for year ${year} using model ${model_path}`);
			await Statistics.generateOLSRaster(output_file_path, {
				covariates_obj: this.input_covariates_obj(),
				format: "float32",
				formatting_parameters: [year],
				model_obj: model_path
			});
			
			await Blacktraffic.yield();
		}
	}
	
	static async B_normaliseOLSRasters () {
		let years = this.years();
		let src_dir = this.intermediate_ols_rasters;
		let dest_dir = this.intermediate_normalised_rasters;
		if (!fs.existsSync(dest_dir)) fs.mkdirSync(dest_dir, { recursive: true });
		
		for (let i = 0; i < years.length; i++) {
			let year = years[i];
			let source_path = `${src_dir}gini_OLS_${year}.png`;
			let output_path = `${dest_dir}gini_OLS_normalised_${year}.png`;
			
			if (!fs.existsSync(source_path)) {
				console.warn(`Source OLS raster not found: ${source_path}`);
				continue;
			}
			
			let raw_raster = GeoPNG.loadNumberRasterImage(source_path, { format: "float32" });
			let min_val = Infinity;
			let max_val = -Infinity;
			
			for (let j = 0; j < raw_raster.data.length; j++) {
				let val = raw_raster.data[j];
				if (val < min_val) min_val = val;
				if (val > max_val) max_val = val;
			}
			
			let range = max_val - min_val;
			console.log(`Normalising year ${year} with min ${min_val} and max ${max_val}`);
			
			GeoPNG.saveNumberRasterImage({
				file_path: output_path,
				format: "float32",
				width: 4320,
				height: 2160,
				function: (local_index) => {
					let val = raw_raster.data[local_index];
					let normalised = (range === 0) ? 0 : (val - min_val) / range;
					return normalised;
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
			
			let normalised_raster = GeoPNG.loadNumberRasterImage(source_path, { format: "float32" });
			
			// Load population data for weighting
			let popc_info = this.input_covariates_obj()["popc_"](year);
			let popc_file = popc_info[0];
			let popc_format = popc_info[1];
			let popc_raster = GeoPNG.loadNumberRasterImage(popc_file, { format: popc_format });
			
			let target_gini_map = {};
			let getColourKeyForPixel = null;
			
			if (year < this.options.gapminder_domain[0]) {
				// Pre-modern domain: clamp purely between 0 and 1
				console.log(`Clamping pre-modern year ${year} directly to [0, 1]`);
				GeoPNG.saveNumberRasterImage({
					file_path: output_path,
					format: "float32",
					width: 4320,
					height: 2160,
					function: (local_index) => {
						let val = normalised_raster.data[local_index];
						return Math.min(1, Math.max(0, val));
					}
				});
				await Blacktraffic.yield();
				continue;
			} else if (year >= this.options.gapminder_domain[0] && year < this.options.subngini_domain[0]) {
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
			
			// Accumulate regional totals to weight OLS Gini by population
			let region_stats = {};
			let total_pixels = normalised_raster.data.length;
			
			for (let index = 0; index < total_pixels; index++) {
				let colour_key = getColourKeyForPixel(index);
				if (target_gini_map[colour_key] !== undefined) {
					let pop = Math.max(0, popc_raster.data[index]);
					let norm_gini = normalised_raster.data[index];
					
					if (!region_stats[colour_key]) {
						region_stats[colour_key] = { weighted_sum: 0, total_pop: 0 };
					}
					region_stats[colour_key].weighted_sum += pop * norm_gini;
					region_stats[colour_key].total_pop += pop;
				}
			}
			
			// Calculate dasymetric scaling factors
			let scale_factors = {};
			Object.iterate(region_stats, (colour_key, stats) => {
				let target = target_gini_map[colour_key];
				scale_factors[colour_key] = (stats.total_pop > 0 && stats.weighted_sum > 0) ?
					target / (stats.weighted_sum / stats.total_pop) : 1;
			});
			
			console.log(`Clamping year ${year} using regional population-weighted target clamping`);
			
			GeoPNG.saveNumberRasterImage({
				file_path: output_path,
				format: "float32",
				width: 4320,
				height: 2160,
				function: (local_index) => {
					let norm_gini = normalised_raster.data[local_index];
					let colour_key = getColourKeyForPixel(local_index);
					let scaled_gini = norm_gini;
					
					if (target_gini_map[colour_key] !== undefined) {
						let factor = scale_factors[colour_key];
						scaled_gini = (factor !== undefined) ? norm_gini * factor : target_gini_map[colour_key];
					}
					
					return Math.min(1, Math.max(0, scaled_gini));
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