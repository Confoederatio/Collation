global.age_sex_WorldPop = class {
	static input_rasters = `${h1}/age_sex_WorldPop/geotiff/`;
	static output_rasters = `${h1}/age_sex_WorldPop/rasters/`;
	
	static async A_convertToPNGs () {
		//Declare local instance variables
		let all_files = await File.getAllFiles(this.input_rasters);
		
		//Iterate over all_files
		for (let i = 0; i < all_files.length; i++) {
			let local_basename = path.basename(all_files[i]);
			
			if (local_basename.endsWith(".tif")) {
				let local_output_file = `${this.output_rasters}/${local_basename.replace(".tif", ".png")}`;
				
				await GeoTIFF.convertToPNG(all_files[i], local_output_file, { 
					format: "float32",
					ignore_values: [-99999]
				});
			}
		}
	}
	
	static async processRasters (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Initialise options
		if (!options.exclude) options.exclude = [];
		
		//Convert to PNGs
		await this.A_convertToPNGs();
	}
};