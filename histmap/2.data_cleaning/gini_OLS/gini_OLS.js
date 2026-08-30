global.gini_OLS = class {
	static bf = `${h2}/gini_OLS/`;
	static input_gini_premodern_csv = `${h1}/gini_Eoscala/`;
	static intermediate_ols_eoscala = `${this.bf}OLS_Eoscala/`;
	static intermediate_ols_gapminder = `${this.bf}OLS_Gapminder/`;
	static intermediate_ols_subngini = `${this.bf}OLS_SubNGini/`;
	
	static options = {
		eoscala_domain: [-21500, 2006],
		gapminder_domain: [1800, 1990],
		subngini_domain: [1990, 2023]
	};
	
	static async getEoscalaGiniObject () {
		
	}
	
	static async getGapminderGiniObject () {
		
	}
	
	static async getSubNGiniObject () {
		
	}
	
	//[WIP] - Util method to fetch [x, y] from [lng, lat] coordinates? Make sure it snaps to nearest land pixel
	static getNearestLandPixel (arg0_lng, arg1_lat) {
		
	}
};