global.population_GHSL = class { //[WIP] - Finish class body
	//[NOTE] - Láng-Ritter et al. rural pop. underweighting is currently being contested. As of 22 August 2026, it should be waited on to see how the academic debate/response chain around it shakes out before going through with code changes - Kätzchen and Tacitus
	static bf = `${h1}/population_GHSL`;
	static input_geotiffs_folder = `${this.bf}/population_rasters/1.geotiffs/`;
	static input_rural_masks_folder = `${this.bf}/population_rasters/1.rural_masks/`;
	static intermediate_rasters_folder = `${this.bf}/population_rasters/2.rasters/`;
	
	static async A_convertToPNGs () {
		//Declare local instance variables
		let all_files = await File.getAllFiles(this.input_geotiffs_folder);
		
		//Iterate over all_files, convert them to float32
		console.log(`- Attempting conversion from source .tif (5-arcmin). Ensure you have GDAL installed in your Anaconda.`);
		
		for (let i = 0; i < all_files.length; i++) {
			let file_name = path.basename(all_files[i]);
			
			if (file_name.startsWith("GHS_POP_E")) {
				let local_year = parseInt(file_name.replace("GHS_POP_E", "")
				.replace(".tif", ""));
				
				let local_output_path = `${this.intermediate_rasters_folder}GHS_POP_${local_year}.png`;
				let temp_tif_path = `${this.intermediate_rasters_folder}temp_${file_name}`;
				
				//Translate 64-bit GeoTIFF to a standard Float32 TIFF to fix the predictor decompression error
				let command = `conda run gdal_translate -ot Float32 "${all_files[i]}" "${temp_tif_path}"`;
					await child_process.execSync(command, { stdio: "ignore" });
				await GeoTIFF.convertToPNG(temp_tif_path, local_output_path, { format: "float32" });
				
				//Clean up temporary converted TIFF
				if (fs.existsSync(temp_tif_path)) fs.unlinkSync(temp_tif_path);
				
				console.log(`- Finished writing ${all_files[i]} to ${local_output_path}.`);
			}
		}
	}
	
	static async B_interpolatePNGs () {
		//Declare local instance variables
		let all_files = await File.getAllFiles(this.intermediate_rasters_folder);
		let all_years = [];
		
		//Iterate over all_files and push to all_years
		for (let i = 0; i < all_files.length; i++) {
			let file_name = path.basename(all_files[i]);
			
			if (file_name.startsWith("GHS_POP_"))
				all_years.push(parseInt(file_name.replace("GHS_POP_", "")
					.replace(".png", "")));
		}
		
		//Iterate over all_years and interpolate between them
		all_years.sort((a, b) => a - b); //Sort in ascending order
		
		for (let i = 0; i < all_years.length - 1; i++) {
			let end_year = all_years[i + 1];
			let start_year = all_years[i];
			let year_gap = end_year - start_year;
			
			if (year_gap > 1) {
				let from_file_path = path.join(this.intermediate_rasters_folder, `GHS_POP_${start_year}.png`);
				let to_file_path = path.join(this.intermediate_rasters_folder, `GHS_POP_${end_year}.png`);
				
				for (let x = start_year + 1; x < end_year; x++) {
					let fraction = (x - start_year)/year_gap;
					let output_file_path = path.join(this.intermediate_rasters_folder, `GHS_POP_${x}.png`);
					
					GeoPNG.linearInterpolation(from_file_path, to_file_path, output_file_path, {
						format: "float32",
						fraction
					});
					console.log(`- Finished interpolating ${output_file_path}.`);
				}
			}
		}
	}
	
	static async C_scalePNGsToGlobalPopulation () {
		//Declare local instance variables
		let all_files = await File.getAllFiles(this.intermediate_rasters_folder);
		let world_pop_obj = population_Global.A_getWorldPopulationObject();
		
		//Iterate over all_files in this.intermediate_rasters_folder and scale them
		for (let i = 0; i < all_files.length; i++) {
			let local_input_file_path = all_files[i];
			let local_scalar = 1;
			
			if (fs.existsSync(local_input_file_path))
				await new Promise((resolve, reject) => {
					setImmediate(() => {
						try {
							let local_year = parseInt(path.basename(local_input_file_path)
								.replace("GHS_POP_", "").replace(".png", ""));
							
							let local_input_png = GeoPNG.loadNumberRasterImage(local_input_file_path, {
								format: "float32"
							});
							let local_input_sum = GeoPNG.getImageSum(local_input_file_path, {
								format: "float32"
							});
							local_scalar = world_pop_obj[local_year]/local_input_sum;
							
							GeoPNG.saveNumberRasterImage({
								file_path: local_input_file_path,
								format: "float32",
								width: 4320,
								height: 2160,
								function: (local_index) => local_input_png.data[local_index]*local_scalar
							});
							console.log(`- ${local_year} - Input Population: ${local_input_sum}, Scalar: ${local_scalar}`);
							
							resolve();
						} catch (e) {
							reject(e);
						}
					});
				});
		}
	}
	
	static async processRasters (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Initialise options
		if (!options.exclude) options.exclude = [];
		
		//Declare local instance variables
		if (!options.exclude.includes("A"))
			await this.A_convertToPNGs();
		if (!options.exclude.includes("B"))
			await this.B_interpolatePNGs();
		if (!options.exclude.includes("C"))
			await this.C_scalePNGsToGlobalPopulation();
	}
};
