//Initialise functions
{
	if (!global.GDP_PPP_SEDAC) global.GDP_PPP_SEDAC = {};
	
	global.GDP_PPP_SEDAC = class {
		static input_path = "./core/1.data_scraping/GDP_PPP_SEDAC/";
		static years = Array.getFilledDomain(1990, 2022);
		
		/**
		 * Returns a PNG array after converting GDP (PPP) 2017$100s from .geotiff to .png.
		 * 
		 * @returns {Array<Object>}
		 */
		static async A_convertToPNGs () {
			//Return statement
			return GeoTIFF.convertToPNGs(`${GDP_PPP_SEDAC.input_path}/GDP_PPP_1990_2022.tif`, `${GDP_PPP_SEDAC.input_path}/GDP_PPP`, {
				scalar: 0.01, //Make sure that GeoPNG is in $100s
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
			
		}
	};
}