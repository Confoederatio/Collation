//Initialise functions
{
	if (!global.population_Stadester_Legacy) global.population_Stadester_Legacy = {};
	
	global.population_Stadester_Legacy = class {
		static bf = `${h1}/population_Stadester_Legacy/`;
		static input_popc_folder = `${this.bf}/stadester_population_rasters/`;
		static input_rurc_folder = `${this.bf}/stadester_rural_rasters/`;
		static input_urbc_folder = `${this.bf}/stadester_urban_rasters/`;
		
		static intermediate_popd_folder = `${this.bf}/stadester_density_rasters/`;
		
		static async A_prepareIntermediates () {
			//Declare local instance variables
			let landarea_file_path = metadata_HYDE.input_raster_land_area;
			let hyde_years = landuse_HYDE.sorted_hyde_years;
			
			//Declare local instance variables
			let landarea_raster  = GeoPNG.loadNumberRasterImage(landarea_file_path, {
				format: "int32"
			});
			
			//Iterate over all hyde_years and prepare intermediates
			for (let i = 0; i < hyde_years.length; i++) {
				let input_file_path  = `${this.input_popc_folder}stadester_population_${hyde_years[i]}.png`;
				let input_raster = GeoPNG.loadNumberRasterImage(input_file_path, {
					format: "int32"
				});
				let output_file_path = `${this.intermediate_popd_folder}stadester_density_${hyde_years[i]}.png`;
				
				GeoPNG.saveNumberRasterImage({
					file_path: `${this.intermediate_popd_folder}stadester_density_${hyde_years[i]}.png`,
					format: "float32",
					height: 2160,
					width: 4320,
					function: (local_index) => {
						let landarea_km2 = landarea_raster.data[local_index];
						
						//Return statement
						if (landarea_km2 === 0) return 0;
						return input_raster.data[local_index]/landarea_km2;
					}
				});
				console.log(`- Saved ${output_file_path}.`);
				await Blacktraffic.yield();
			}
		}
		
		static async processRasters (arg0_options) {
			//Convert from parameters
			let options = (arg0_options) ? arg0_options : {};
			
			//Initialise options
			if (!options.exclude) options.exclude = [];
			
			//Process intermediates
			if (!options.exclude.includes("A"))
				await this.A_prepareIntermediates();
		}
	};
}