global.GDP_Eoscala_transform = class {
	static delta_GDP_nominal_folder = `${h3}/delta_GDP_nominal/`;
	static delta_GDP_pc_folder = `${h3}/delta_GDP_pc/`;
	static delta_GDP_PPP_folder = `${h3}/delta_GDP_PPP/`;
	static delta_GDP_PPP_pc_folder = `${h3}/delta_GDP_PPP_pc/`;
	
	static async A_generateDeltaRasters () {
		let hyde_years = landuse_HYDE.sorted_hyde_years;
		
		//Generate delta series for all folders
		console.log(`Generating delta series for ${this.delta_GDP_nominal_folder} ..`);
		await GeoPNG.generateDeltaSeries(this.delta_GDP_nominal_folder, {
			input_format: "float32",
			input_format_function: (y) => `${GDP_pc.intermediate_gdp_scaled_to_national}GDP_${y}.png`,
			prefix: "delta_GDP_",
			years: hyde_years
		});
		console.log(`Generating delta series for ${this.delta_GDP_pc_folder} ..`);
		await GeoPNG.generateDeltaSeries(this.delta_GDP_nominal_folder, {
			input_format: "float32",
			input_format_function: (y) => `${GDP_pc.output_gdp_pc_folder}GDP_pc_${y}.png`,
			prefix: "delta_GDP_pc_",
			years: hyde_years
		});
		console.log(`Generating delta series for ${this.delta_GDP_PPP_folder} ..`);
		await GeoPNG.generateDeltaSeries(this.delta_GDP_PPP_folder, {
			input_format: "float32",
			input_format_function: (y) => `${GDP_PPP_pc.intermediate_gdp_ppp_scaled_to_national}GDP_PPP_${y}.png`,
			prefix: "delta_GDP_PPP_",
			years: hyde_years
		});
		console.log(`Generating delta series for ${this.delta_GDP_PPP_pc_folder} ..`);
		await GeoPNG.generateDeltaSeries(this.delta_GDP_PPP_pc_folder, {
			input_format: "float32",
			input_format_function: (y) => `${GDP_PPP_pc.output_gdp_ppp_pc_folder}GDP_PPP_pc_${y}.png`,
			prefix: "delta_GDP_PPP_pc_",
			years: hyde_years
		});
	}
	
	static async processRasters (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Initialise options
		if (!options.exclude) options.exclude = [];
		
		//Process rasters
		if (!options.exclude.includes("A")) await this.A_generateDeltaRasters();
	}
};