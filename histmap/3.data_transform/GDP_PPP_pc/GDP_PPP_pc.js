global.GDP_PPP_pc = class {
	static cf = `${h3}/GDP_PPP_pc/`;
	static output_gdp_pc_folder = `${this.cf}rasters/`;
	
	static async A_generateGDP_pcRasters () {
		//Declare local instance variables
		let hyde_years = landuse_HYDE.sorted_hyde_years;
		
		for (let i = 0; i < hyde_years.length; i++) {
			let local_gdp_file_path = `${GDP_PPP.intermediate_scaled_to_global}GDP_PPP_${hyde_years[i]}.png`;
			let local_popc_file_path = `${population_Stadester_Legacy.input_popc_folder}stadester_population_${hyde_years[i]}.png`;
			
			if (fs.existsSync(local_gdp_file_path) && fs.existsSync(local_popc_file_path)) {
				let local_gdp_raster = GeoPNG.loadNumberRasterImage(local_gdp_file_path, {
					format: "float32"
				});
				let local_popc_raster = GeoPNG.loadNumberRasterImage(local_popc_file_path, {
					format: "int32"
				});
				let local_output_file_path = `${this.output_gdp_pc_folder}GDP_PPP_pc_${hyde_years[i]}.png`;
				
				GeoPNG.saveNumberRasterImage({
					file_path: local_output_file_path,
					format: "float32",
					width: 4320,
					height: 2160,
					function: (local_index) => {
						//Declare local instance variables
						let local_gdp_pc = local_gdp_raster.data[local_index]/local_popc_raster.data[local_index];
						
						//Return statement
						if (isNaN(local_gdp_pc)) return 0;
						return local_gdp_pc;
					}
				});
				console.log(`- Saved ${local_output_file_path}.`);
				await Blacktraffic.yield();
			}
		}
	}
	
	static async processRasters (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Initialise options
		if (!options.exclude) options.exclude = [];
		
		//1. Generate GDP_pc rasters
		if (!options.exclude.includes("A")) await this.A_generateGDP_pcRasters();
	}
};