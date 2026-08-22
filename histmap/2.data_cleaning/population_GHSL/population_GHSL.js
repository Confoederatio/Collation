global.population_GHSL = class {
	static bf = `${h1}/population_GHSL`;
	static input_geotiffs_folder = `${this.bf}/population_rasters/1.geotiffs/`;
	static intermediate_rasters_folder = `${this.bf}/population_rasters/2.intermediate_rasters/`;
	
	static async A_convertToPNGs () {
		//Declare local instance variables
		let all_files = await File.getAllFiles(this.input_geotiffs_folder);
		
		for (let i = 0; i < all_files.length; i++) {
			let file_name = path.basename(all_files[i]);
			
			if (file_name.startsWith("GHS_POP_E")) {
				let local_year = parseInt(file_name.replace("GHS_POP_E", "")
					.replace(".tif", ""));
				
				let local_output_path = `${this.intermediate_rasters_folder}GHS_POP_${local_year}.png`;
				
				await GeoTIFF.convertToPNG(all_files[i], local_output_path, { format: "float32" });
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
		
	}
};
