global.population_Substrata_northern_america = class {
	static northern_america_obj = {
		areal_masks: {
			//0. Agricultural Areas
			//0.1. McEvedy and Jones (Agricultural)
			mcevedy_and_jones_agricultural: {
				colour: `#34cc48`,
				density: 0.4 //(km^2)
			},
			
			//0.2. Nevle and Bird (https://www.researchgate.net/figure/Selected-features-of-the-Pre-Columbian-American-cultural-landscape-adapted-from-Denevan_fig1_234285204)
			nevle_and_bird_agricultural: {
				colour: `#3cf03c`,
				density: 0.35 //(km^2) - Estimations from Williams (https://web.archive.org/web/20200922183825/https://twitter.com/RWArchaeology/status/1308447051752103938)
			},
			nevle_and_bird_irrigated: {
				colour: `#adcb90`,
				density: 15/2.58999 //(km^2) - Estimations from Williams (https://web.archive.org/web/20200922183825/https://twitter.com/RWArchaeology/status/1308447051752103938)
			},
			
			//1. Localised Scaling
			//1.1. Driver and Massey (https://sci-hub.se/https://doi.org/10.2307/1005714)
			driver_and_massey_zero_to_two: {
				colour: "#004c6d",
				density: 1/100 //(km^2)
			},
			driver_and_massey_two_to_five: {
				colour: "#346888",
				density: (2+5)/200 //(km^2)
			},
			driver_and_massey_five_to_twelve: {
				colour: "#5886a5",
				density: (5+12)/200 //(km^2)
			},
			driver_and_massey_twelve_to_thirty: {
				colour: "#7aa6c2",
				density: (12+30)/200 //(km^2)
			},
			driver_and_massey_thirty_to_seventyfive: {
				colour: "#9dc6e0",
				density: (30+75)/200 //(km^2)
			},
			driver_and_massey_seventyfive_or_more: {
				colour: "#c1e7ff",
				density: 75/100 //(km^2)
			},
			
			//1.2. E. North American Population (Milner and Chaplin), (https://sci-hub.se/https://www.cambridge.org/core/journals/american-antiquity/article/abs/eastern-north-american-population-at-ca-ad-1500/DDC4DF121320C8CBA5BC9A4899C5DF1E
			"milner_and_chaplin_0.3": {
				colour: "#938901",
				density: 0.3
			},
			"milner_and_chaplin_0.505": {
				colour: "#b3a642",
				density: 0.505
			},
			"milner_and_chaplin_0.9": {
				colour: "#d2c471",
				density: 0.9
			},
			"milner_and_chaplin_1.1": {
				colour: "#f1e3a0",
				density: 1.1
			},
			
			//2. Regional Scaling
			hawaiian_islands: { //[WIP] - Fetch scholarly estimates for Hawaii
				colour: [170, 154, 88],
				population: { //(Dye) (https://evols.library.manoa.hawaii.edu/server/api/core/bitstreams/1afaf6ee-abef-4458-9f3e-b1a582675565/content)
					"1100": 100,
					"1219": 160,
					"1450": 135,
					"1500": 150,
					"1600": 96,
					"1700": 250,
					"1778": 360, //Dye, Swanson (https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3917957) midpoint
					"1805": 175,
					"1819": 144,
					"1850": 84.165,
					"1872": 56.897,
					"1896": 109.020
				},
				scalar: 1000,
				special_domain: true
			},
			nelson_northern_america: {
				colour: [175, 63, 34],
				population: {
					'0': 2175925.925925925,
					'100': 2185185.1851851847,
					'200': 2194444.444444444,
					'300': 2203703.7037037034,
					'400': 2212962.962962963,
					'500': 2388888.888888889,
					'600': 2314814.8148148153,
					'700': 2407407.407407408,
					'800': 2305555.555555557,
					'900': 2500000.000000001,
					'1000': 2500000.000000001,
					'1100': 2361111.111111113,
					'1200': 2453703.7037037048,
					'1300': 2569444.444444444,
					'1400': 2666666.666666666,
					'1500': 2916666.666666665,
					'-3000': 2222222.2222222225,
					'-2200': 2222222.222222222,
					'-2000': 2256944.444444445,
					'-1400': 2361111.111111111,
					'-1000': 2361111.111111113,
					'-700': 2222222.222222222,
					'-300': 2222222.222222222,
					'-100': 2166666.6666666665
				}
			},
			nelson_w_north_america: {
				colour: [60, 115, 173],
				population: {
					'0': 2870370.3703703685,
					'100': 2907407.407407406,
					'200': 2944444.444444443,
					'300': 2981481.481481481,
					'400': 3018518.518518518,
					'500': 2888888.8888888867,
					'600': 3055555.5555555555,
					'700': 3055555.5555555555,
					'800': 3055555.5555555555,
					'900': 2986111.11111111,
					'1000': 3124999.999999998,
					'1100': 3194444.444444443,
					'1200': 3287037.037037037,
					'1300': 3374999.999999997,
					'1400': 3645833.333333333,
					'1500': 3416666.6666666637,
					'-3000': 2500000.000000001,
					'-2200': 2500000,
					'-2000': 2506944.4444444454,
					'-1400': 2527777.7777777775,
					'-1000': 2670634.9206349193,
					'-700': 2777777.7777777775,
					'-300': 2777777.7777777775,
					'-100': 2833333.333333333
				},
			},
			nelson_e_north_america: {
				colour: [87, 122, 175],
				population: {
					'0': 3615740.7407407393,
					'100': 3620370.3703703694,
					'200': 3624999.999999999,
					'300': 3629629.629629629,
					'400': 3634259.2592592593,
					'500': 3611111.111111109,
					'600': 3638888.8888888895,
					'700': 3638888.8888888895,
					'800': 3830555.5555555574,
					'900': 3715277.777777779,
					'1000': 3958333.3333333335,
					'1100': 4201388.88888889,
					'1200': 4189814.8148148176,
					'1300': 4444444.444444445,
					'1400': 4513888.888888892,
					'1500': 4444444.444444445,
					'-3000': 2777777.777777775,
					'-2200': 3055555.555555555,
					'-2000': 3090277.7777777775,
					'-1400': 3194444.444444444,
					'-1000': 3353174.6031746026,
					'-700': 3472222.222222222,
					'-300': 3333333.333333333,
					'-100': 3611111.111111111
				}
			},
			
			//3. National Level Scaling
			canada: {
				colour: [175, 63, 76],
				population: { //(Millions)
					"-10000": 0.10, //McEvedy and Jones (1978) gives a base population of 0,1M
					"0": 0.12, //Figure taken from HYDE3.3
					"1000": 0.38,
					"1500": 0.76,
					"1600": 0.2,
					"1800": 0.65 //Figure taken from Statista (https://www.statista.com/statistics/1066836/population-canada-since-1800/)
				},
				scalar: 1000000,
				special_domain: true
			},
			the_continental_usa: {
				colour: [67, 134, 175],
				population: {
					"-10000": 0.233969, //Figures from 10000BC to 1000BC taken from HYDE3.3
					"-9000": 0.259965,
					"-8000": 0.288850,
					"-7000": 0.320945,
					"-6000": 0.356605,
					"-5000": 0.396228,
					"-4000": 0.440253,
					"-3000": 0.489171,
					"-2000": 0.543523,
					"-1000": 0.603915,
					"0": 0.76, //Adjusted McEvedy and Jones (1978)
					"500": 0.846755, //Figures from 10000BC to 1000BC taken from HYDE3.3
					"1000": 1.52,
					"1500": 3.04,
					"1600": 0.8
				},
				scalar: 1000000
			}
		},
		domain: [-10000, 1600] //Time domain for Project Centaur 0.5b (10000BC - 1600AD)
	};
	
	static bf = `${h3}/population_Substrata.northern_america/`;
	static ef = `${h3}/population_Substrata.outlier_removal/`;
	static input_rasters_regions = `${this.bf}/rasters_regions/`;
	static output_rasters = `${this.ef}rasters_1.northern_america/`;
	
	static async A_getNorthernAmericaPopulationObject () {
		//Declare local instance variables
		let hyde_years = landuse_HYDE.sorted_hyde_years;
		let northern_america_obj = JSON.parse(JSON.stringify(this.northern_america_obj));
		
		let northern_america_domain = northern_america_obj.domain;
		
		//Iterate over all_mask_keys and interpolate over all HYDE years within objects with .population
		let all_mask_keys = Object.keys(northern_america_obj.areal_masks);
		
		Object.iterate(northern_america_obj.areal_masks, (local_key, local_value) => {
			//Make sure colour is in [R, G, B] format
			if (typeof local_value.colour === "string")
				local_value.colour = Colour.convertHexToRGB(local_value.colour);
			if (local_value.population) {
				let all_local_years = Object.keys(local_value.population)
				.map(Number).sort((a, b) => a - b);
				let local_mask_domain = [all_local_years[0], all_local_years[all_local_years.length - 1]];
				let years_to_interpolate = [];
				
				//Iterate over all hyde_years within domain
				for (let x = 0; x < hyde_years.length; x++)
					if (hyde_years[x] >= local_mask_domain[0] && hyde_years[x] <= local_mask_domain[1]) {
						let is_in_domain = false;
						if (hyde_years[x] >= northern_america_domain[0] && hyde_years[x] <= northern_america_domain[1])
							is_in_domain = true;
						if (local_value.special_domain) is_in_domain = true;
						
						//If the current year is in domain and is not already an entry, try to interpolate for it
						if (is_in_domain && !local_value.population[hyde_years[x]])
							years_to_interpolate.push(hyde_years[x]);
					}
				
				//Interpolate for years_to_interpolate; make sure that the object is scaled properly
				local_value.population = Object.cubicSplineInterpolation(local_value.population, { years: years_to_interpolate });
				if (local_value.scalar)
					local_value.population = Object.multiply(local_value.population, local_value.scalar);
			}
			
			northern_america_obj.areal_masks[local_key].key = local_key;
		});
		
		//Iterate over all_mask_keys and set their colourmap
		Object.iterate(northern_america_obj.areal_masks, (local_key, local_value) => {
			let local_mask = JSON.parse(JSON.stringify(local_value));
			let actual_key = [local_mask.colour[0], local_mask.colour[1], local_mask.colour[2]].join(",");
			
			northern_america_obj.areal_masks[actual_key] = local_mask;
			northern_america_obj.areal_masks[actual_key].is_clone = true;
		});
		
		//Return statement
		return northern_america_obj;
	}
	
	static async A_generateStadesterNorthernAmericaRasters (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Declare local instance variables
		let hyde_years = (options.hyde_years) ? options.hyde_years : landuse_HYDE.sorted_hyde_years;
		let land_area_raster = GeoPNG.loadNumberRasterImage(metadata_HYDE.input_raster_land_area);
		let northern_america_obj = await this.A_getNorthernAmericaPopulationObject();
		let raster_obj = {};
		
		let northern_america_domain = northern_america_obj.domain;
		
		//Iterate over all_png_files in common_defines.input_file_paths.velkscala_northern_america_folder; populate raster_obj
		let all_png_files = fs.readdirSync(this.input_rasters_regions)
			.filter((file) => path.extname(file).toLowerCase() === ".png");
		
		for (let i = 0; i < all_png_files.length; i++)
			all_png_files[i] = `${this.input_rasters_regions}/${all_png_files[i]}`;
		for (let i = 0; i < all_png_files.length; i++) {
			console.log(`- Loading ${all_png_files[i]} ..`);
			raster_obj[all_png_files[i]] = GeoPNG.loadImage(all_png_files[i]);
		}
		
		//Iterate over all hyde_years; all_mask_keys in order
		let all_mask_keys = Object.keys(northern_america_obj.areal_masks);
		
		for (let i = 0; i < hyde_years.length; i++) {
			let local_input_file_path = `${population_Substrata_outlier_removal.intermediate_outliers_removed_rasters}popc_${hyde_years[i]}.png`;
			let local_output_file_path = `${this.output_rasters}popc_${hyde_years[i]}.png`;
			let total_sum_for_year = 0;
			
			//Copy to local_output_file_path first for handling
			fs.copyFileSync(local_input_file_path, local_output_file_path);
			
			//Iterate over all_mask_keys; process local_mask for all_png_files in raster_obj
			for (let x = 0; x < all_mask_keys.length; x++) {
				let is_in_domain = false;
				let local_mask = northern_america_obj.areal_masks[all_mask_keys[x]];
				
				//Internal guard clause if local_mask .is_clone
				console.log(`- Processing local_mask ${local_mask.key}: (is_clone: ${local_mask.is_clone})`);
				if (local_mask.is_clone) continue;
				
				let all_local_years;
				if (typeof local_mask.population === "object")
					all_local_years = Object.keys(local_mask.population)
					.map(Number).sort((a, b) => a - b);
				let local_mask_domain = (all_local_years) ?
					[all_local_years[0], all_local_years[all_local_years.length - 1]] : northern_america_domain;
				if (!local_mask.domain) {
					local_mask.domain = local_mask_domain;
				} else {
					local_mask_domain = local_mask.domain;
				}
				
				//Check if local_mask has an applicable domain
				if (hyde_years[i] >= local_mask_domain[0] && hyde_years[i] <= local_mask_domain[1])
					if (hyde_years[i] >= northern_america_domain[0] && hyde_years[i] <= northern_america_domain[1]) {
						is_in_domain = true;
					} else if (local_mask.special_domain) {
						is_in_domain = true;
					}
				console.log(` - Domain: ${local_mask_domain.join(", ")}`);
				
				//If the mask is in domain; iterate over all_png_files in raster_obj to apply it
				if (is_in_domain) {
					let local_area = [];
					total_sum_for_year = 0;
					
					//.density handling; calculate fetch sum area to set local_mask.population for that year
					if (local_mask.density) {
						for (let y = 0; y < all_png_files.length; y++) {
							let local_raster = raster_obj[all_png_files[y]];
							let local_raster_area = 0;
							
							GeoPNG.operateNumberRasterImage({
								file_path: land_area_raster,
								function: function (arg0_index, arg1_number) {
									//Convert from parameters
									let local_index = arg0_index;
									let local_number = arg1_number;
									
									//Declare local instance variables
									let byte_index = local_index;
									
									//Check if local_raster.data matches the present object
									if (local_number > 0) {
										let local_area_mask = northern_america_obj.areal_masks[[
											local_raster.data[byte_index],
											local_raster.data[byte_index + 1],
											local_raster.data[byte_index + 2]
										].join(",")];
										
										if (local_area_mask)
											if (local_area_mask.key === local_mask.key)
												local_raster_area += local_number;
									}
								}
							});
							
							local_area.push(local_raster_area);
						}
						local_area = Math.max(...local_area);
						
						if (local_mask.population === undefined) local_mask.population = {};
						local_mask.population[hyde_years[i]] = local_area*local_mask.density;
					}
					console.log(` - Local population:`, local_mask.population[hyde_years[i]]);
					
					//.population handling; scale to colour code
					if (local_mask.population)
						if (local_mask.population[hyde_years[i]]) {
							let local_population_raster = GeoPNG.loadNumberRasterImage(local_output_file_path);
							let local_population = local_mask.population[hyde_years[i]];
							let local_scalar = 1;
							let local_sum = 0;
							
							//Iterate over all_png_files; compute local_scalar
							for (let y = 0; y < all_png_files.length; y++) {
								let local_raster = raster_obj[all_png_files[y]];
								let local_raster_population = 0;
								
								GeoPNG.operateNumberRasterImage({
									file_path: local_population_raster,
									function: function (arg0_index, arg1_number) {
										//Convert from parameters
										let local_index = arg0_index;
										let local_number = arg1_number;
										
										//Declare local instance variables
										let byte_index = local_index;
										
										//Check if local_raster.data matches the present object
										if (local_number > 0) {
											let local_area_mask = northern_america_obj.areal_masks[[
												local_raster.data[byte_index],
												local_raster.data[byte_index + 1],
												local_raster.data[byte_index + 2]
											].join(",")];
											
											if (local_area_mask)
												if (local_area_mask.key === local_mask.key)
													local_raster_population += local_number;
										}
									}
								});
								
								if (local_raster_population > local_sum) local_sum = local_raster_population;
							}
							local_scalar = Math.returnSafeNumber(local_population/local_sum);
							
							console.log(`- Scaling ${local_output_file_path} for ${local_mask.key} | Area: ${local_area}, Population: ${String.formatNumber(local_population)}, Scalar: ${local_scalar}`);
							
							//Scale local population raster to scalar
							GeoPNG.saveNumberRasterImage({
								file_path: local_output_file_path,
								height: 2160,
								width: 4320,
								
								function: function (arg0_index) {
									let index = arg0_index;
									
									//Declare local instance variables
									let byte_index = arg0_index*4; //Index must be multiplied by 4 since we are using loadImage(), and not loadNumberRasterImage()
									let local_value = local_population_raster.data[index];
									
									//Internal guard clause if local_value is 0
									if (local_value === 0) return 0;
									
									//Iterate over all_png_files to see if their .data at byte_index contains our target key
									for (let y = 0; y < all_png_files.length; y++) {
										let local_raster = raster_obj[all_png_files[y]];
										let local_raster_colour = [
											local_raster.data[byte_index],
											local_raster.data[byte_index + 1],
											local_raster.data[byte_index + 2],
										].join(",");
										
										let local_area_mask = northern_america_obj.areal_masks[local_raster_colour];
										
										if (local_area_mask)
											if (local_area_mask.key === local_mask.key) {
												total_sum_for_year += Math.ceil(local_value*local_scalar);
												return Math.ceil(local_value*local_scalar);
											}
									}
									
									//Return statement; default value otherwise
									return local_value;
								}
							});
							
							console.log(`- Finished processing ${local_output_file_path} for ${hyde_years[i]}. Total Northern America sum for category: ${String.formatNumber(total_sum_for_year)}`);
						}
					
					//Force a yield, perform GC
					await new Promise(resolve => setImmediate(resolve));
					if (global.gc) global.gc();
				}
			}
		}
	}
	
	static async processRasters () {
		//1. Process Northern America rasters into main outliers folder
		await this.A_generateStadesterNorthernAmericaRasters();
	}
}