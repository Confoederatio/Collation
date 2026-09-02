global.wealth_income_WID = class { //[WIP] - Finish class body
	static bf = `${h2}/wealth_income_WID/`;
	static input_folder  = `${h1}/wealth_income_WID/`;
	static intermediate_discretionary_income = `${this.bf}discretionary_income/`;
	static intermediate_disposable_income = `${this.bf}disposable_income/`;
	static intermediate_net_income = `${this.bf}net_income/`;
	static intermediate_net_wealth = `${this.bf}net_wealth/`;
	
	static options = {
		deflator: (174.6/326.031)*0.9004, //(CPI_$2000/CPI_$2025)*EUR_USD_2000
		file_prefix: "WID_data_",
		file_suffix: ".csv",
		
		//These refer to prefixes; so .startsWith() is how you would filter a .csv for such keys
		//Income
		net_income: ["aptinc"],
		disposable_income: ["adiinc"],
		discretionary_income: ["asavho", "aindgo"], //(Savings rate + government-provided services)
		
		//Wealth
		net_wealth: ["ahweal"]
	};
	
	static async getWIDObject (arg0_key) {
		//Convert from parameters
		let key = arg0_key;
		
		//Declare local instance variables
		let all_files = await File.getAllFiles(this.input_folder);
		let prefix_array = this.options[key];
		
		//Iterate over all_files
		for (let i = 0; i < all_files.length; i++) {
			let basename = path.basename(all_files[i]);
			
			if (basename.startsWith(this.options.file_prefix) && basename.endsWith(this.options.file_suffix)) {
				
			}
		}
	}
};