//Initialise functions
{
	if (!global.GDP_PPP_SEDAC) global.GDP_PPP_SEDAC = {};
	
	global.GDP_PPP_SEDAC = class { //[WIP] - Finish function
		static input_path = `${h1}/GDP_PPP_SEDAC/`;
		static years = Array.getFilledDomain(1990, 2022);
		
		/**
		 * Returns a PNG array after converting GDP (PPP) 2017$100s from .geotiff to .png.
		 * 
		 * @returns {Array<Object>}
		 */
		static async A_convertToPNGs () {
			//Return statement
			return GeoTIFF.convertToPNGs(`${GDP_PPP_SEDAC.input_path}/GDP_PPP_1990_2022.tif`, `${GDP_PPP_SEDAC.input_path}/GDP_PPP`, {
				format: "float32",
				years: GDP_PPP_SEDAC.years
			});
		}
		
		//[WIP] - Finish function bodies
		static async B_loadHYDESEDACYear (arg0_year) {
			//Convert from parameters
			let year = arg0_year;
			
			//Declare local instance variables
			let input_file_path = `${this.input_path}/GDP_PPP_${year}.png`;
			
			
		}
		
		static async C_trainPotentialEconomicActivityModel (arg0_year, arg1_options) {
			
		}
		
		static async C_trainPotentialEconomicActivityModels () {
			
		}
		
		static async D_processPotentialEconomicActivityModel (arg0_options) {
			
		}
		
		static async E_geomeanPotentialEconomicActivityModel () {
			
		}
		
		static async processRasters (arg0_options) {
			//Convert from parameters
			let options = (arg0_options) ? arg0_options : {};
			
			//Initialise options
			if (!options.exclude) options.exclude = [];
			
			//1. Convert to PNGs
			if (!options.exclude.includes("A"))
				await this.A_convertToPNGs();
		}
	};
}