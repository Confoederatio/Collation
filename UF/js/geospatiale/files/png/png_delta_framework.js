//Initialise functions
{
	if (!global.GeoPNG)
		/**
		 * Analogous to a GeoTIFF file format, but in PNG form for easier editing. Single variable. Part of Geospatiale III.
		 *
		 * @namespace GeoPNG
		 */
		global.GeoPNG = {};
	
	/**
	 * Generates a delta series for a specific timeseries, used for later covariates.
	 * 
	 * @param {string} arg0_output_folder_path
	 * @param {Object} [arg1_options]
	 *  @param {string} [arg1_options.input_format="int32"]
	 *  @param {function} [arg1_options.input_format_function] - (arg0_year:{@link number}). Returns {@link string} representing the file path for the given year.
	 *  @param {number[]} [arg1_options.years]
	 *
	 * @returns {Promise<void>}
	 */
	GeoPNG.generateDeltaSeries = async function (arg0_output_folder_path, arg1_options) {
		//Declare local instance variables
		let output_folder_path = arg0_output_folder_path;
		let options = (arg1_options) ? arg1_options : {};
		
		//Initialise options
		if (!options.input_format) options.input_format = "int32";
		if (!options.prefix) options.prefix = "delta_";
		if (!options.years) options.years = [];
		
		//Iterate over years to calculate yearly rate of change between steps
		for (let i = 1; i < options.years.length; i++) {
			let current_year = options.years[i];
			let previous_year = options.years[i - 1];
			let year_diff = current_year - previous_year;
			
			let current_file_path = options.input_format_function(current_year);
			let previous_file_path = options.input_format_function(previous_year);
			
			console.log(`- Generating delta raster for ${current_year} (Interval: ${year_diff} year(s)) ..`);
			
			//Load current and previous rasters
			let current_raster = GeoPNG.loadNumberRasterImage(current_file_path, {
				format: options.input_format
			});
			let previous_raster = GeoPNG.loadNumberRasterImage(previous_file_path, {
				format: options.input_format
			});
			
			let output_file_path = `${output_folder_path}/${options.prefix}${current_year}.png`;
			
			//Save the delta raster; the function calculates the slope (rate of change)
			GeoPNG.saveNumberRasterImage({
				file_path: output_file_path,
				format: "float32",
				width: current_raster.width,
				height: current_raster.height,
				function: (local_index) => {
					let current_val = current_raster.data[local_index];
					let previous_val = previous_raster.data[local_index];
					
					//Return yearly rate of change: (V2 - V1) / (T2 - T1)
					return (current_val - previous_val)/year_diff;
				}
			});
			
			console.log(`- Saved delta raster to ${output_file_path}.`);
			await Blacktraffic.yield();
		}
	};
}