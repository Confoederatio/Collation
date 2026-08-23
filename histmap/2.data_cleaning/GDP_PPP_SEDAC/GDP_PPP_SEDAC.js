//Initialise functions
{
	if (!global.GDP_PPP_SEDAC) global.GDP_PPP_SEDAC = {};
	
	global.GDP_PPP_SEDAC = class { //[WIP] - Finish function
		static bf = `${h1}/GDP_PPP_SEDAC/`;
		static years = Array.getFilledDomain(1990, 2022);
		
		/**
		 * Returns a PNG array after converting GDP (PPP) 2017$100s from .geotiff to .png.
		 * 
		 * @returns {Array<Object>}
		 */
		static async A_convertToPNGs () {
			//Return statement
			return GeoTIFF.convertToPNGs(`${GDP_PPP_SEDAC.bf}/GDP_PPP_1990_2022.tif`, `${GDP_PPP_SEDAC.bf}/GDP_PPP`, {
				format: "float32",
				years: GDP_PPP_SEDAC.years
			});
		}
		
		//[WIP] - Finish function bodies
		static async B_loadCovariates (arg0_year) {
			//Convert from parameters
			let year = arg0_year;
			
			//Declare local instance variables
			let all_hyde_keys = Object.keys(landuse_HYDE.hyde_dictionary);
			let hyde_data = [];
			let hyde_folder = landuse_HYDE.bf;
			let input_file_path = `${this.bf}/GDP_PPP_${year}.png`;
			let sedac_image = GeoPNG.loadNumberRasterImage(input_file_path, { 
				format: "float32" 
			});
			let sedac_data = sedac_image.data;
			
			//Iterate over all HYDE stocks; load each HYDE variable as a predictor
			for (let i = 0; i < all_hyde_keys.length; i++) {
				let local_year_string = landuse_HYDE._getHYDEYearName(year);
				
				let local_file_path = `${hyde_folder}/${all_hyde_keys[i]}${local_year_string}_number.png`;
				let local_rawdata = GeoPNG.loadNumberRasterImage(local_file_path, { 
					format: "float32" 
				}).data;
				hyde_data.push(local_rawdata);
			}
			
			//Transpose HYDE data to match format [samples, features]
			let feature_count = hyde_data.length;
			let sample_count = sedac_data.length;
			let X = new Array(sample_count);
			let Y = new Array(sample_count);
			
			//Iterate over all elements in sample_count
			for (let i = 0; i < sample_count; i++) {
				let local_row = new Array(feature_count);
				
				//Iterate over all feature_count
				for (let x = 0; x < feature_count; x++)
					local_row[x] = hyde_data[x][i];
				X[i] = local_row;
				Y[i] = [sedac_data[i]];
			}
			
			//Return statement
			return { keys: all_hyde_keys, X, Y };
		}
		
		static async C_trainGDP_PPPModel (arg0_year, arg1_options) {
			
		}
		
		static async C_trainGDP_PPPModels () {
			
		}
		
		static async D_geomeanGDP_PPPModel () {
			
		}
		
		static async E_processGDP_PPPModel (arg0_options) {
			
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