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
	
	static _getNearestLandPixel (arg0_lng, arg1_lat) {
		//Convert from parameters
		let lng = parseFloat(arg0_lng);
		let lat = parseFloat(arg1_lat);
		
		//Declare local instance variables
		if (!this.landarea_raster) this.landarea_raster = GeoPNG.loadNumberRasterImage(
			metadata_HYDE.input_raster_land_area, { format: "int32" });
		
		//Return statement
		return Geospatiale.getEquirectangularNearestPixelWith(lng, lat, {
			input_raster: this.landarea_raster,
			special_function: (raster, cx, cy) => {
				let pixel_index = cy*raster.width + cx;
				return (raster.data[pixel_index] > 0);
			}
		});
	}
	
	static async getEoscalaGiniObject () {
		
	}
	
	static async getGapminderGiniObject () {
		
	}
	
	static async getSubNGiniObject () {
		
	}
};