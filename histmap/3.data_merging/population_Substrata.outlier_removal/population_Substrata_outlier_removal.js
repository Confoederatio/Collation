global.population_Substrata_outlier_removal = class {
	static bf = `${h3}/population_Substrata.outlier_removal/`;
	static input_outlier_rasters = `${this.bf}rasters_outliers/`;
	static intermediate_outliers_removed_rasters = `${this.bf}rasters_outliers_removed/`;
	static intermediate_rasters_northern_america = `${this.bf}rasters_1.northern_america/`;
	static intermediate_rasters_scaled_to_statista = `${this.bf}rasters_2.scaled_to_regions/`;
	
	static intermediate_rasters_scaled_to_global = `${this.bf}rasters_3.scaled_to_global/`;
	static statista_obj = {
		asia: {
			colour: [173, 62, 62],
			population: {
				"-10000": 738,
				"-9000": 1317,
				"-8000": 2079,
				"-7000": 3316,
				"-6000": 5332,
				"-5000": 8629,
				"-4000": 14284,
				"-3000": 23417,
				"-2000": 38914,
				"-1000": 64400,
				"0": 106722,
				"100": 109162,
				"200": 111595,
				"300": 114387,
				"400": 117263,
				"500": 120236,
				"600": 123325,
				"700": 128983,
				"800": 134817,
				"900": 151598,
				"1000": 168382,
				"1100": 214083,
				"1200": 231209,
				"1300": 202672,
				"1400": 213026,
				"1500": 255241,
				"1600": 343376,
				"1700": 366370,
				"1750": 532260,
				"1800": 656800
			},
			scalar: 1000,
		},
		africa: {
			colour: [155, 101, 77],
			population: {
				"-10000": 242,
				"-9000": 343,
				"-8000": 490,
				"-7000": 708,
				"-6000": 1032,
				"-5000": 1517,
				"-4000": 2352,
				"-3000": 4148,
				"-2000": 6260,
				"-1000": 9264,
				"0": 15186,
				"100": 16627,
				"200": 18270,
				"300": 19315,
				"400": 20677,
				"500": 22307,
				"600": 24446,
				"700": 28185,
				"800": 32915,
				"900": 37126,
				"1000": 41465,
				"1100": 44319,
				"1200": 47743,
				"1300": 53532,
				"1400": 57880,
				"1500": 62207,
				"1600": 72815,
				"1700": 80209,
				"1750": 82677,
				"1800": 85589,
			},
			scalar: 1000,
		},
		latin_america: {
			colour: [71, 165, 101],
			population: {
				"-10000": 278,
				"-9000": 363,
				"-8000": 489,
				"-7000": 680,
				"-6000": 967,
				"-5000": 1405,
				"-4000": 2093,
				"-3000": 3164,
				"-2000": 4851,
				"-1000": 7580,
				"0": 11982,
				"100": 12695,
				"200": 13451,
				"300": 14253,
				"400": 15105,
				"500": 16011,
				"600": 16973,
				"700": 17998,
				"800": 19090,
				"900": 21703,
				"1000": 24329,
				"1100": 27235,
				"1200": 30163,
				"1300": 33127,
				"1400": 36137,
				"1500": 39220,
				"1600": 8808,
				"1700": 12259,
				"1750": 15586,
				"1800": 20116
			},
			scalar: 1000,
		},
		europe: {
			colour: [47, 97, 170],
			population: {
				"-10000": 548,
				"-9000": 759,
				"-8000": 1062,
				"-7000": 1499,
				"-6000": 2134,
				"-5000": 3067,
				"-4000": 4447,
				"-3000": 6558,
				"-2000": 10297,
				"-1000": 16727,
				"0": 29331,
				"100": 30979,
				"200": 32617,
				"300": 31165,
				"400": 29718,
				"500": 25858,
				"600": 21859,
				"700": 23913,
				"800": 26150,
				"900": 29197,
				"1000": 32260,
				"1100": 38060,
				"1200": 50553,
				"1300": 69479,
				"1400": 50947,
				"1500": 68423,
				"1600": 86304,
				"1700": 98182,
				"1750": 122394,
				"1800": 149018
			},
			scalar: 1000,
		},
		northern_america: {
			colour: [87, 122, 175],
			population: {
				"-10000": 39,
				"-9000": 52,
				"-8000": 70,
				"-7000": 93,
				"-6000": 125,
				"-5000": 167,
				"-4000": 223,
				"-3000": 300,
				"-2000": 402,
				"-1000": 540,
				"0": 725,
				"100": 762,
				"200": 800,
				"300": 841,
				"400": 884,
				"500": 929,
				"600": 977,
				"700": 1027,
				"800": 1080,
				"900": 1203,
				"1000": 1325,
				"1100": 1440,
				"1200": 1602,
				"1300": 1742,
				"1400": 1931,
				"1500": 2100,
				"1600": 984,
				"1700": 1227,
				"1750": 3654,
				"1800": 7331,
			},
			
			scalar: (Math.weightedGeometricMean([2200, 4400, 5130])/2100)*1000, //https://www.russellsage.org/sites/default/files/american-indians-chapter-1-web.pdf (Ubelaker, Denevan, Thornton/Marsh-Thornton)
		},
		cis: {
			colour: [20, 114, 30],
			population: {
				"-10000": 159,
				"-9000": 238,
				"-8000": 357,
				"-7000": 536,
				"-6000": 804,
				"-5000": 1207,
				"-4000": 1810,
				"-3000": 2715,
				"-2000": 4072,
				"-1000": 6108,
				"0": 9162,
				"100": 8622,
				"200": 8146,
				"300": 7729,
				"400": 7366,
				"500": 6881,
				"600": 6440,
				"700": 6209,
				"800": 6015,
				"900": 6353,
				"1000": 6692,
				"1100": 8940,
				"1200": 12131,
				"1300": 12812,
				"1400": 12815,
				"1500": 15947,
				"1600": 19495,
				"1700": 23015,
				"1750": 33549,
				"1800": 45613
			},
			scalar: 1000,
		},
		oceania: {
			colour: [183, 142, 91],
			population: {
				"-10000": 251,
				"-9000": 253,
				"-8000": 357,
				"-7000": 536,
				"-6000": 804,
				"-5000": 1207,
				"-4000": 265,
				"-3000": 273,
				"-2000": 284,
				"-1000": 302,
				"0": 327,
				"100": 331,
				"200": 334,
				"300": 338,
				"400": 342,
				"500": 346,
				"600": 351,
				"700": 356,
				"800": 362,
				"900": 372,
				"1000": 383,
				"1100": 395,
				"1200": 408,
				"1300": 421,
				"1400": 432,
				"1500": 505,
				"1600": 579,
				"1700": 651,
				"1750": 695,
				"1800": 783
			},
			scalar: 1000,
		},
		middle_east: {
			colour: [33, 153, 73],
			population: {
				"-10000": 176,
				"-9000": 241,
				"-8000": 336,
				"-7000": 476,
				"-6000": 811,
				"-5000": 1668,
				"-4000": 1896,
				"-3000": 4246,
				"-2000": 7034,
				"-1000": 10146,
				"0": 14805,
				"100": 15922,
				"200": 17097,
				"300": 17288,
				"400": 17555,
				"500": 17862,
				"600": 18273,
				"700": 19164,
				"800": 20059,
				"900": 21195,
				"1000": 20204,
				"1100": 18175,
				"1200": 19271,
				"1300": 18618,
				"1400": 16607,
				"1500": 17726,
				"1600": 21594,
				"1700": 21253,
				"1750": 22848,
				"1800": 24568
			},
			scalar: 1000,
		}
	};
	static statista_regions_raster = `${this.bf}/config/statista_regions.png`;
	
	static async A_getHYDEOutlierMasksObject () {
		//Declare local instance variables
		let all_files = fs.readdirSync(this.input_outlier_rasters);
		let return_obj = {};
		
		//Iterate over all_files and fetch time domains per file_path
		for (let i = 0; i < all_files.length; i++) {
			let local_file_path = path.join(this.input_outlier_rasters, all_files[i]);
			
			if (!fs.statSync(local_file_path).isDirectory() && local_file_path.endsWith(".png")) {
				let split_file_name = local_file_path.replace(".png", "").split("_");
				
				if (split_file_name.length >= 2) {
					let end_year = parseInt(split_file_name[split_file_name.length - 1]);
					let start_year = parseInt(split_file_name[split_file_name.length - 2]);
					
					return_obj[local_file_path] = {
						file_path: local_file_path,
						end_year: end_year,
						start_year: start_year
					};
				} else {
					console.error(`${local_file_path} has less than 2 arguments. It must include a _<start_year>_<end_year> formatter as a suffix.`);
				}
			}
		}
		
		//Return statement
		return return_obj;
	}
	
	static async A_removeOutliersForHYDEYear (arg0_year) {
		//Convert from parameters
		let year = arg0_year;
		
		//Declare local instance variables
		let fallback_file_path = `${population_KK10LUH2.output_kk10_luh2_global_rasters}popc_${year}.png`;
		let fallback_raster = GeoPNG.loadNumberRasterImage(fallback_file_path);
		let hyde_input_file_path = `${landuse_HYDE.intermediate_rasters_scaled_to_global}popc_${year}.png`;
		let hyde_output_file_path = `${this.intermediate_outliers_removed_rasters}popc_${year}.png`;
		
		let hyde_outlier_masks = await this.A_getHYDEOutlierMasksObject();
		let hyde_outlier_rasters = {};
		let hyde_pixel_outliers = []; //Indices detected as being outliers
		let hyde_raster = GeoPNG.loadNumberRasterImage(hyde_input_file_path);
		
		//Iterate over all_hyde_outlier_masks; load hyde_outlier_rasters
		Object.iterate(hyde_outlier_masks, (local_key, local_value) => {
			if (year >= local_value?.start_year && year <= local_value?.end_year)
				hyde_outlier_rasters[local_key] = GeoPNG.loadImage(local_key);
		});
		
		//Operate over current image; check if number is an outlier compared to neighbouring pixels; iterate over all pixels in hyde_raster, excluding border pixels
		for (let i = 1; i < hyde_raster.height - 1; i++)
			for (let x = 1; x < hyde_raster.width - 1; x++) {
				let local_index = i*hyde_raster.width + x;
				let neighbour_average = GeoPNG.getRasterNeighbourAverage(hyde_raster.data, i, x, hyde_raster.height, hyde_raster.width);
				
				if (!isNaN(neighbour_average) && neighbour_average > 0 && hyde_raster.data[local_index] > 8*neighbour_average)
					hyde_pixel_outliers.push(local_index);
			}
		
		console.log(` - Outliers detected:`, hyde_pixel_outliers.length);
		
		//Save number raster image
		GeoPNG.saveNumberRasterImage({
			file_path: hyde_output_file_path,
			height: hyde_raster.height,
			width: hyde_raster.width,
			function: (local_index) => {
				//Declare local instance variables
				let byte_index = local_index*4;
				let is_outlier = (hyde_pixel_outliers.includes(local_index));
				
				//Check if any of hyde_outlier_rasters contains [0, 0, 0] masking for this pixel
				if (!is_outlier) {
					let all_hyde_outlier_rasters = Object.keys(hyde_outlier_rasters);
					
					for (let i = 0; i < all_hyde_outlier_rasters.length; i++) {
						let local_raster = hyde_outlier_rasters[all_hyde_outlier_rasters[i]];
						let local_raster_colour = [
							local_raster.data[byte_index],
							local_raster.data[byte_index + 1],
							local_raster.data[byte_index + 2],
							local_raster.data[byte_index + 3]
						].join(",");
						
						//Break if outlier is detected
						if (local_raster_colour === "0,0,0,255") {
							is_outlier = true;
							break;
						}
					}
				}
				
				//If this pixel is an outlier, overwrite it with the equivalent content in fallback_image
				//Return statement
				if (is_outlier) {
					return fallback_raster.data[local_index];
				} else {
					return hyde_raster.data[local_index];
				}
			}
		});
	}
	
	static async A_removeOutliersForHYDE () {
		//Declare local instance variables
		let hyde_years = landuse_HYDE.hyde_years;
		
		//Iterate over all hyde_years
		for (let i = 0; i < hyde_years.length; i++) try {
			console.log(`- Removing HYDE outliers for ${landuse_HYDE._getHYDEYearName(hyde_years[i])} ..`);
			await this.A_removeOutliersForHYDEYear(hyde_years[i]);
		} catch (e) { console.error(e); }
	}
	
	//[QUARANTINE]
	static async B_scaleProcessedHYDEToStatistaRegions () {
		//Declare local instance variables
		let hyde_years = landuse_HYDE.hyde_years;
		let regions_mask = GeoPNG.loadImage(this.statista_regions_raster);
		let regions_map = {};
		let statista_obj = JSON.parse(JSON.stringify(this.statista_obj));
		
		let global_min_year = Infinity;
		let global_max_year = -Infinity;
		
		//Create color-to-region mapping and determine domains
		Object.keys(statista_obj).forEach((key) => {
			let region = statista_obj[key];
			let color_key = region.colour.join(",");
			
			let all_local_years = Object.keys(region.population)
			.map(Number)
			.sort((a, b) => a - b);
			let local_mask_domain = [
				all_local_years[0],
				all_local_years[all_local_years.length - 1],
			];
			
			if (local_mask_domain[0] < global_min_year) global_min_year = local_mask_domain[0];
			if (local_mask_domain[1] > global_max_year) global_max_year = local_mask_domain[1];
			
			let years_to_interpolate = [];
			for (let x = 0; x < hyde_years.length; x++) {
				if (
					hyde_years[x] >= local_mask_domain[0] &&
					hyde_years[x] <= local_mask_domain[1] &&
					region.population[hyde_years[x]] === undefined
				) {
					years_to_interpolate.push(hyde_years[x]);
				}
			}
			
			if (years_to_interpolate.length > 0)
				region.population = Object.cubicSplineInterpolation(region.population, {
					years: years_to_interpolate,
				});
			
			regions_map[color_key] = {
				key: key,
				domain: local_mask_domain,
				...region,
			};
		});
		
		//Iterate over all hyde_years
		for (let i = 0; i < hyde_years.length; i++) {
			let year = hyde_years[i];
			let input_path = `${this.intermediate_rasters_northern_america}popc_${year}.png`;
			let fallback_path = `${this.intermediate_outliers_removed_rasters}popc_${year}.png`;
			let output_path = `${this.intermediate_rasters_scaled_to_statista}popc_${year}.png`;
			
			//Determine source path based on availability
			let source_path = fs.existsSync(input_path) ? input_path : (fs.existsSync(fallback_path) ? fallback_path : null);
			
			if (source_path) {
				//If year is outside domain, simply copy forward to next stage to avoid zeroing data
				if (year < global_min_year || year > global_max_year) {
					console.log(`- Year ${year} outside Statista domain. Copying from ${source_path === input_path ? "Northern America" : "Outlier Removal"} stage ..`);
					fs.copyFileSync(source_path, output_path);
					continue;
				}
				
				console.log(`- Scaling Statista regions for year ${year} (Source: ${source_path === input_path ? "N. America" : "Outlier Fallback"}) ..`);
				let current_raster = GeoPNG.loadNumberRasterImage(source_path);
				let regional_sums = {};
				let regional_scalars = {};
				
				//1. Calculate current pixel sums per region
				for (let x = 0; x < current_raster.data.length; x++) {
					let val = current_raster.data[x];
					if (val > 0) {
						let byte_index = x * 4;
						let color_key = [
							regions_mask.data[byte_index],
							regions_mask.data[byte_index + 1],
							regions_mask.data[byte_index + 2],
						].join(",");
						
						let region_match = regions_map[color_key];
						if (region_match)
							regional_sums[region_match.key] =
								(regional_sums[region_match.key] || 0) + val;
					}
				}
				
				//2. Calculate scalars per region
				Object.keys(statista_obj).forEach((region_key) => {
					let region_data = statista_obj[region_key];
					let color_key = region_data.colour.join(",");
					let mapped_region = regions_map[color_key];
					let current_sum = regional_sums[region_key] || 0;
					
					if (year >= mapped_region.domain[0] && year <= mapped_region.domain[1]) {
						let target_pop = (mapped_region.population[year] || 0) * mapped_region.scalar;
						regional_scalars[region_key] = current_sum > 0 ? target_pop / current_sum : 1;
					} else {
						regional_scalars[region_key] = 1;
					}
				});
				
				//3. Apply regional scaling and save
				GeoPNG.saveNumberRasterImage({
					file_path: output_path,
					height: current_raster.height,
					width: current_raster.width,
					function: (index) => {
						let val = current_raster.data[index];
						if (val === 0) return 0;
						
						let byte_index = index * 4;
						let color_key = [
							regions_mask.data[byte_index],
							regions_mask.data[byte_index + 1],
							regions_mask.data[byte_index + 2],
						].join(",");
						
						let region_match = regions_map[color_key];
						if (region_match) {
							return Math.ceil(val * regional_scalars[region_match.key]);
						}
						
						return val;
					},
				});
			} else {
				console.warn(`- No source raster found for year ${year} in Stage B1 (${this.intermediate_rasters_northern_america}) or Fallback Stage A (${this.intermediate_outliers_removed_rasters}).`);
			}
		}
	}
	
	static async C_scaleProcessedHYDEToGlobal () {
		//Declare local instance variables
		let hyde_years = landuse_HYDE.hyde_years;
		let world_pop_obj = population_Global.A_getWorldPopulationObject();
		
		//Iterate over all hyde_years and scale to the global target
		for (let i = 0; i < hyde_years.length; i++) {
			//Input is the output of the Statista stage (Stage B2)
			let local_hyde_input_path = `${this.intermediate_rasters_scaled_to_statista}popc_${hyde_years[i]}.png`;
			//Output is the final Global Rasters folder (Stage C)
			let local_output_path = `${this.intermediate_rasters_scaled_to_global}popc_${hyde_years[i]}.png`;
			let local_world_pop = world_pop_obj[hyde_years[i]];
			
			if (fs.existsSync(local_hyde_input_path)) {
				let local_hyde_sum = GeoPNG.getImageSum(local_hyde_input_path);
				let local_scalar = local_world_pop / local_hyde_sum;
				
				console.log(`- Final global scaling for ${hyde_years[i]} (x${local_scalar.toFixed(4)}) ..`);
				
				let local_hyde_image = GeoPNG.loadNumberRasterImage(local_hyde_input_path);
				GeoPNG.saveNumberRasterImage({
					file_path: local_output_path,
					height: local_hyde_image.height,
					width: local_hyde_image.width,
					function: (local_index) => Math.ceil(local_hyde_image.data[local_index] * local_scalar),
				});
			} else {
				console.warn(`- ${local_hyde_input_path} could not be found.`);
			}
		}
	}
	
	static async processRasters (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Initialise options
		if (!options.exclude) options.exclude = [];
		
		//1. Remove outliers for HYDE
		if (!options.exclude.includes("A")) await this.A_removeOutliersForHYDE();
		//2. Handle continental regions, i.e. Northern America; Statista regions
		if (!options.exclude.includes("B1")) await population_Substrata_northern_america.processRasters();
		if (!options.exclude.includes("B2")) await this.B_scaleProcessedHYDEToStatistaRegions();
		//3. Scale processed outliers to global population
		if (!options.exclude.includes("C")) await this.C_scaleProcessedHYDEToGlobal();
	}
};