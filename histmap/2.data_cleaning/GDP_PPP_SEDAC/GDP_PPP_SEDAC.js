global.GDP_PPP_SEDAC = class {
	static bf = `${h1}/GDP_PPP_SEDAC/`;
	static intermediate_folder = `${h2}/GDP_PPP_SEDAC/`;
	static intermediate_ols_folder = `${h2}/GDP_PPP_SEDAC/OLS/`;
	static years = Array.getFilledDomain(1990, 2022);
	
	//Hyde; Stadestér formatters
	static hf = () => `${landuse_HYDE.bf}/rasters/`;
	static hf1 = (y) => landuse_HYDE._getHYDEYearName(y);
	static sf = () => population_Stadester_Legacy;
	
	static lu_covariates_obj = {
		"conv_rangeland": (y) => [`${this.hf()}/conv_rangeland${this.hf1(y)}_number.png`, "float32"],
		"cropland": (y) => [`${this.hf()}/cropland${this.hf1(y)}_number.png`, "float32"],
		"grazing": (y) => [`${this.hf()}/grazing${this.hf1(y)}_number.png`, "float32"],
		"ir_norice": (y) => [`${this.hf()}/ir_norice${this.hf1(y)}_number.png`, "float32"],
		"ir_rice": (y) => [`${this.hf()}/ir_rice${this.hf1(y)}_number.png`, "float32"],
		"pasture": (y) => [`${this.hf()}/pasture${this.hf1(y)}_number.png`, "float32"],
		"rangeland": (y) => [`${this.hf()}/rangeland${this.hf1(y)}_number.png`, "float32"],
		"rf_norice": (y) => [`${this.hf()}/rf_norice${this.hf1(y)}_number.png`, "float32"],
		"rf_rice": (y) => [`${this.hf()}/rf_rice${this.hf1(y)}_number.png`, "float32"],
		"shifting": (y) => [`${this.hf()}/shifting${this.hf1(y)}_number.png`, "float32"],
		"tot_irri": (y) => [`${this.hf()}/tot_irri${this.hf1(y)}_number.png`, "float32"],
		"tot_rainfed": (y) => [`${this.hf()}/tot_rainfed${this.hf1(y)}_number.png`, "float32"],
		"tot_rice": (y) => [`${this.hf()}/tot_rice${this.hf1(y)}_number.png`, "float32"],
		"uopp_": (y) => [`${this.hf()}/uopp_${this.hf1(y)}_number.png`, "float32"]
	};
	
	static pop_covariates_obj = {
		"popc_": (y) => [`${this.sf().input_popc_folder}/stadester_population_${y}.png`, "int32"],
		"popd_": (y) => [`${this.sf().intermediate_popd_folder}/stadester_density_${y}.png`, "float32"],
		"rurc_": (y) => [`${this.sf().input_rurc_folder}/stadester_rural_${y}.png`, "int32"],
		"urbc_": (y) => [`${this.sf().input_urbc_folder}/stadester_urban_${y}.png`, "int32"]
	};
	
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
	
	static async B_loadCovariates (arg0_year, arg1_covariates_obj) {
		//Convert from parameters
		let year = arg0_year;
		let local_covariates_obj = arg1_covariates_obj;
		
		//Declare local instance variables
		let input_file_path = `${this.bf}/GDP_PPP_${year}.png`;
		
		//Return statement
		return Statistics.loadOLSCovariates(input_file_path, {
			utility_format: "float32",
			
			covariates_obj: local_covariates_obj,
			formatting_parameters: [year]
		});
	}
	
	static async B_trainGDP_PPPModel (arg0_year, arg1_covariates_obj, arg2_prefix, arg3_options) {
		//Convert from parameters
		let year = parseInt(arg0_year);
		let local_covariates_obj = arg1_covariates_obj;
		let local_prefix = arg2_prefix;
		let options = (arg3_options) ? arg3_options : {};
		
		//Initialise options
		if (!options.lambda) options.lambda = 1e11;
		if (!options.key) options.key = `${local_prefix}${year}`;
		
		//Declare local instance variables
		let covariates_data = await this.B_loadCovariates(year, local_covariates_obj);
		let output_file_path = `${this.intermediate_ols_folder}/${local_prefix}${year}.json`;
		
		//Return statement
		return Statistics.trainOLSModel(output_file_path, covariates_data, options);
	}
	
	static async B_trainGDP_PPPModels (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Iterate over all years for both LU and POP models
		for (let i = 0; i < this.years.length; i++) {
			let local_year = this.years[i];
			
			//Train LU model
			await this.B_trainGDP_PPPModel(local_year, this.lu_covariates_obj, "OLS_LU_GDP_PPP_", {
				...options,
				key: `LU_${local_year}`
			});
			
			//Train POP model
			await this.B_trainGDP_PPPModel(local_year, this.pop_covariates_obj, "OLS_POP_GDP_PPP_", {
				...options,
				key: `POP_${local_year}`
			});
		}
	}
	
	static async C_geomeanGDP_PPPModels () {
		//Compute geometric means for LU and POP separately
		await Statistics.geomeanOLSModels(this.intermediate_ols_folder, "OLS_LU_GDP_PPP_");
		await Statistics.geomeanOLSModels(this.intermediate_ols_folder, "OLS_POP_GDP_PPP_");
	}
	
	static async D_processGDP_PPPModel (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Declare local instance variables
		let lu_model_path = `${this.intermediate_ols_folder}/geomean_OLS_LU_GDP_PPP.json`;
		let pop_model_path = `${this.intermediate_ols_folder}/geomean_OLS_POP_GDP_PPP.json`;
		
		//Process and adjust the LU model
		let processed_lu_model = await Statistics.processOLSModel(lu_model_path, {
			...options,
			covariates_obj: this.lu_covariates_obj,
			target: (y) => [`${this.bf}/GDP_PPP_${y}.png`, "float32"],
			steps: this.years,
		});
		
		//Process and adjust the POP model
		let processed_pop_model = await Statistics.processOLSModel(pop_model_path, {
			...options,
			covariates_obj: this.pop_covariates_obj,
			target: (y) => [`${this.bf}/GDP_PPP_${y}.png`, "float32"],
			steps: this.years,
		});
		
		//Combine the two models into one final model
		let final_coefficients = {
			...processed_lu_model.coefficients,
			...processed_pop_model.coefficients
		};
		
		let merged_model = {
			key: "processed_base_model",
			coefficients: final_coefficients
		};
		
		//Save the combined model
		let output_file_path = `${this.intermediate_ols_folder}/processed_base_model.json`;
		fs.writeFileSync(output_file_path, JSON.stringify(merged_model, null, 2));
		console.log(`Merged OLS base model saved to ${output_file_path}.`);
		
		//Return statement
		return merged_model;
	}
	
	static async processRasters (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Initialise options
		if (!options.exclude) options.exclude = [];
		
		//1. Convert to PNGs
		if (!options.exclude.includes("A")) {
			await this.A_convertToPNGs();
			await population_Stadester_Legacy.processRasters();
		}
		
		//2. Train individual yearly OLS models (LU and POP separately)
		if (!options.exclude.includes("B")) await this.B_trainGDP_PPPModels(options);
		
		//3. Compute geomeans for both model types
		if (!options.exclude.includes("C")) try {
			await this.C_geomeanGDP_PPPModels();
		} catch (e) { console.error(e); }
		
		//4. Bidirectionally adjust weights and merge models
		if (!options.exclude.includes("D")) await this.D_processGDP_PPPModel(options);
	}
};