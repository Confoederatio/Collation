global.gini_SubNGini = class {
	static bf = `${h1}/gini_SubNGini`;
	static input_subnational_raster = `${this.bf}/rast_adm1_gini_disp_1990_2023.tif`;
	static intermediate_subnational_rasters = `${h2}/gini_SubNGini/subnational_gini_rasters/`;
	static years = Array.getFilledDomain(1990, 2023);
	
	static async A_convertToPNGs () {
		console.log(`- Converting SubNGini to rasters ...`);
		await GeoTIFF.convertToPNGs(this.input_subnational_raster, `${this.intermediate_subnational_rasters}gini`, {
			format: "float32",
			years: this.years
		});
		console.log(`- Finished converting Gini GeoTIFFs to rasters.`);
	}
	
	static async B_generateDasymetricMasks () {
		
	}
	
	static async processRasters (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Initialise options
		if (!options.exclude) options.exclude = [];
		
		//1. Convert to intermediate_subnational_rasters
		if (!options.exclude.includes("A"))
			await this.A_convertToPNGs();
		if (!options.exclude.includes("B"))
			await this.B_generateDasymetricMasks();
	}
};