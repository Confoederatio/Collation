global.births_deaths_Kummu = class {
	static bf = `${h2}/births_deaths_Kummu/`;
	static input_births_raster = `${h1}/births_deaths_Kummu/raster_birth_rate_2000_2019.tif`;
	static input_deaths_raster = `${h1}/births_deaths_Kummu/raster_death_rate_2000_2019.tif`;
	static intermediate_births_folder = `${this.bf}/subnational_birth_rasters/`;
	static intermediate_deaths_folder = `${this.bf}/subnational_death_rasters/`;
	static output_births_folder = `${this.bf}/subnational_birth_masks/`;
	static output_deaths_folder = `${this.bf}/subnational_death_masks/`;
	static years = Array.getFilledDomain(2000, 2019);
	
	/**
	 * Converts raw births and deaths GeoTIFF files into individual yearly float32 PNG raster steps.
	 *
	 * @returns {Promise<void>}
	 */
	static async A_convertToPNGs () {
		console.log(`- Converting births GeoTIFF to rasters ...`);
		await GeoTIFF.convertToPNGs(this.input_births_raster, `${this.intermediate_births_folder}births`, {
			format: "float32",
			years: this.years
		});
		console.log(`- Converting deaths GeoTIFF to rasters ...`);
		await GeoTIFF.convertToPNGs(this.input_deaths_raster, `${this.intermediate_deaths_folder}deaths`, {
			format: "float32",
			years: this.years
		});
		console.log(`- Finished processing GeoTIFFs to rasters.`);
	}
	
	/**
	 * Shatters temporal birth and death rate rasters into unique spatial-temporal areal mask partitions.
	 * Writes mask rasters to `_masks.png` and trace histories to `_metadata.json`.
	 *
	 * @returns {Promise<Object>} An object containing metadata tracking lineage for births and deaths.
	 */
	static async B_generateArealMasks () {
		//Declare local instance variables
		let births_input_prefix = `${this.intermediate_births_folder}births_`;
		let births_output_prefix = `${this.output_births_folder}births`;
		let deaths_input_prefix = `${this.intermediate_deaths_folder}deaths_`;
		let deaths_output_prefix = `${this.output_deaths_folder}deaths`;
		
		console.log(`- Shattering subnational births rasters into areal masks ..`);
		let births_metadata = await GeoPNG.shatter(births_input_prefix, births_output_prefix, {
			years: this.years
		});
		
		console.log(`- Shattering subnational deaths rasters into areal masks ..`);
		let deaths_metadata = await GeoPNG.shatter(deaths_input_prefix, deaths_output_prefix, {
			years: this.years
		});
		
		//Return statement
		return {
			births: births_metadata,
			deaths: deaths_metadata
		};
	}
	
	/**
	 * Standard interface method to run the entire processing pipeline sequentially unless stages are specifically bypassed.
	 *
	 * @param {Object} [arg0_options] - Execution configuration parameters.
	 *  @param {string[]} [arg0_options.exclude=[]] - List of step keys to bypass (e.g. ["A", "B"]).
	 *
	 * @returns {Promise<void>}
	 */
	static async processRasters (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Initialise options
		if (!options.exclude) options.exclude = [];
		
		//Convert to PNGs, generate areal masks
		if (!options.exclude.includes("A")) await this.A_convertToPNGs();
		if (!options.exclude.includes("B")) await this.B_generateArealMasks();
	}
};