global.population_GHSL = class { //[WIP] - Finish class body
	static bf = `${h1}/population_GHSL`;
	static input_geotiffs_folder = `${this.bf}/population_rasters/1.geotiffs/`;
	static intermediate_rasters_folder = `${this.bf}/population_rasters/2.rasters/`;
	
	static async A_convertToPNGs () {
		//Declare local instance variables
		let all_files = await File.getAllFiles(this.input_geotiffs_folder);
		
		//Iterate over all_files, convert them to float32
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
		
	}
	
	static async C_scalePNGsToGlobalPopulation () {
		
	}
	
	static async D_adjustForRuralAreas () {
		
	}
	
	static async E_convertToGeoPNG_int32 () {
		
	}
	
	static async processRasters (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Initialise options
		if (!options.exclude) options.exclude = [];
		
		//Declare local instance variables
		if (!options.exclude.includes("A"))
			await this.A_convertToPNGs();
	}
};
