global.wealth_income_WID = class { //[WIP] - Finish class body
	static bf = `${h2}/wealth_income_WID/`;
	static input_folder  = `${h1}/wealth_income_WID/`;
	static input_json = `${this.input_folder}json/`;
	static intermediate_discretionary_income = `${this.bf}discretionary_income/`;
	static intermediate_disposable_income = `${this.bf}disposable_income/`;
	static intermediate_net_income = `${this.bf}net_income/`;
	static intermediate_net_wealth = `${this.bf}net_wealth/`;
	
	static options = {
		//Metadata
		deflator: (174.6/326.031)*0.9004, //(CPI_$2000/CPI_$2025)*EUR_USD_2000
		file_prefix: "WID_data_",
		file_suffix: ".csv",
		variables: ["net_income", "disposable_income", "discretionary_income", "net_wealth"],
		
		//These refer to prefixes; so .startsWith() is how you would filter a .csv for such keys
		//Income
		net_income: ["aptinc"],
		disposable_income: ["adiinc"],
		discretionary_income: ["asavho", "aindgo"], //(Savings rate + government-provided services)
		
		//Wealth
		net_wealth: ["ahweal"],
	};
	
	static async getWIDObject (arg0_key) {
		//Convert from parameters
		let key = arg0_key;
		
		//Declare local instance variables
		let all_files = await File.getAllFiles(this.input_folder);
		let prefix_array = this.options[key];
		let return_obj = {};
		
		//Iterate over all_files
		for (let i = 0; i < all_files.length; i++) {
			let basename = path.basename(all_files[i]);
			
			if (basename.startsWith(this.options.file_prefix) && basename.endsWith(this.options.file_suffix)) {
				let csv_array = File.loadCSVAsArray(all_files[i], { delimiter: ";" });
				let iso_code = basename.replace(this.options.file_prefix, "")
					.replace(this.options.file_suffix, "");
				
				if (!return_obj[iso_code]) return_obj[iso_code] = {};
				let local_obj = return_obj[iso_code];
				
				for (let x = 0; x < csv_array.length; x++) {
					let csv_row = csv_array[x];
					
					for (let y = 0; y < prefix_array.length; y++) {
						let current_prefix = prefix_array[y];
						
						if (csv_row.variable.startsWith(current_prefix) && csv_row.percentile === "p0p100") {
							//Initialise year and prefix arrays if they do not exist
							if (!local_obj[csv_row.year]) local_obj[csv_row.year] = {};
							if (!local_obj[csv_row.year][current_prefix]) local_obj[csv_row.year][current_prefix] = [];
							
							let local_value = parseFloat(csv_row.value)*this.options.deflator;
							local_obj[csv_row.year][current_prefix].push(local_value);
						}
					}
				}
			}
			console.log(`- Finished scanning ${i + 1}/${all_files.length} .csv files ...`);
			await Blacktraffic.yield();
		}
		
		//Post-processing logic to handle weighted geometric means and prefix summation
		let iso_codes = Object.keys(return_obj);
		for (let i = 0; i < iso_codes.length; i++) {
			let current_iso = iso_codes[i];
			let year_data = return_obj[current_iso];
			let flattened_year_map = {};
			let years = Object.keys(year_data);
			
			for (let y = 0; y < years.length; y++) {
				let current_year = years[y];
				let prefix_map = year_data[current_year];
				let prefixes = Object.keys(prefix_map);
				let year_total = 0;
				
				for (let p = 0; p < prefixes.length; p++) {
					let value_array = prefix_map[prefixes[p]];
					
					//Calculate weighted geometric mean for this prefix's values and add to year sum
					year_total += Math.weightedGeometricMean(value_array);
				}
				flattened_year_map[current_year] = year_total;
			}
			// Replace the temporary nested structure with the flat year map
			return_obj[current_iso] = flattened_year_map;
		}
		
		//Return statement
		return return_obj;
	}
	
	static async A_cacheWIDObjects () {
		//Declare local instance variables
		let options = this.options;
		
		//Iterate over options.variables
		for (let i = 0; i < options.variables.length; i++) {
			let output_file_path = `${this.input_json}${options.variables[i]}.json`;
			console.log(`Processing ${options.variables[i]}.`);
			let variable_obj = await this.getWIDObject(options.variables[i]);
			
			fs.writeFileSync(output_file_path, JSON.stringify(variable_obj, null, 2));
			console.log(`Saved cache file to ${output_file_path}.`);
		}
	}
};