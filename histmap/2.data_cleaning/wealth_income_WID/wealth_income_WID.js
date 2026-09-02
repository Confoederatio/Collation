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
					let is_included = false;
					
					for (let y = 0; y < prefix_array.length; y++)
						if (csv_array[x].variable.startsWith(prefix_array[y]))
							is_included = true;
					if (is_included)
						Object.modifyValue(local_obj, csv_array[x].year, parseFloat(csv_array[x].value));
				}
			}
			console.log(`- Finished scanning ${i + 1}/${all_files.length} .csv files ...`);
			await Blacktraffic.yield();
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