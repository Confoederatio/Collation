global.gini_SubNGini = class { //[WIP] - Finish class body
	static bf = `${h1}/gini_SubNGini`;
	static input_subnational_raster = `${this.bf}/rast_adm1_gini_disp_1990_2023.tif`;
	static intermediate_subnational_masks_folder = `${h2}/gini_SubNGini/subnational_gini_masks/`;
	static intermediate_subnational_rasters = `${h2}/gini_SubNGini/subnational_gini_rasters/`;
	static output_areal_json = `${this.intermediate_subnational_masks_folder}areal_metadata.json`;
	static years = Array.getFilledDomain(1990, 2023);
	
	static async A_convertToPNGs () {
		console.log(`- Converting SubNGini to rasters ...`);
		await GeoTIFF.convertToPNGs(this.input_subnational_raster, `${this.intermediate_subnational_rasters}gini`, {
			format: "float32",
			years: this.years
		});
		console.log(`- Finished converting Gini GeoTIFFs to rasters.`);
	}
	
	static async B_generateArealMasks () {
		//Declare local instance variables
		let height = 0;
		let mask_data;
		let next_region_id = 1;
		let width = 0;
		let years = this.years;
		
		//region_history stores 'delta' for each refinement step
		//region_id: { parent: id, year: number, value: number }
		let region_history = new Map();
		
		//Iterate over all years
		for (let i = 0; i < years.length; i++) {
			let local_path = `${this.intermediate_subnational_masks_folder}gini_${years[i]}.png`;
			
			if (fs.existsSync(local_path)) {
				let local_raster = GeoPNG.loadNumberRasterImage(local_path, {
					format: "float32"
				});
				
				//Initialise mask_data on the first valid year found
				if (!mask_data) {
					mask_data = new Int32Array(local_raster.data.length);
					height = local_raster.height; 
					width = local_raster.width;
				}
				
				//Iterate over all pixels in local_raster.data
				let transition_map  = new Map();
				
				for (let x = 0; x < local_raster.data.length; x++) {
					let current_pixel_id = mask_data[x];
					let current_value = local_raster.data[x];
					
					//A region is unique if its previous ID + current value is a unique combination
					let transition_key = `${current_pixel_id}|${current_value}`;
					
					if (!transition_map.has(transition_key)) {
						let new_id = next_region_id++;
						transition_map.set(transition_key, new_id);
						
						region_history.set(new_id, {
							parent: current_pixel_id,
							year: years[i],
							value: current_value
						});
					}
					mask_data[x] = transition_map.get(transition_key);
				}
				console.log(`- Processed ${years[i]}. Current unique region count: ${next_region_id - 1}`);
				await Blacktraffic.yield();
			}
		}
		
		if (mask_data) {
			//1. Identify which IDs actually exist in the final shattered map
			let final_ids = new Set();
			
			//Iterate over all pixels in mask_data
			for (let i = 0; i < mask_data.length; i++)
				final_ids.add(mask_data[i]);
			
			//2. Reconstruct temporal metadata by walking back up the lineage tree
			let final_metadata = {};
			
			for (let local_id of final_ids) {
				let local_history = {};
				let local_pointer = local_id;
				
				while (local_pointer > 0) {
					let history_entry = region_history.get(local_pointer);
					
					if (history_entry) {
						local_history[history_entry.year] = history_entry.value;
						local_pointer = history_entry.parent;
					} else {
						local_pointer = 0;
					}
				}
				final_metadata[Colour.encodeNumberAsRGBA(Number(local_id)).join(",")] = local_history;
			}
			
			//3. Save the areal mask PNG (int32 encoding)
			GeoPNG.saveNumberRasterImage({
				file_path: `${this.intermediate_subnational_masks_folder}areal_masks.png`,
				format: "int32",
				width,
				height,
				function: function (local_index) {
					//Return statement
					return mask_data[local_index];
				}
			});
			
			//4. Save areal metadata JSON
			fs.writeFileSync(this.output_areal_json, JSON.stringify(final_metadata));
			console.log(`- Finished generating areal masks. Final unique regions: ${final_ids.size}.`);
			
			//Return statement
			return final_metadata;
		}
	}
	
	static async processRasters (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Initialise options
		if (!options.exclude) options.exclude = [];
		
		//1. Convert to intermediate_subnational_rasters
		if (!options.exclude.includes("A"))
			await this.A_convertToPNGs();
		if (!options.exclude.includes("B"))
			await this.B_generateArealMasks();
	}
};