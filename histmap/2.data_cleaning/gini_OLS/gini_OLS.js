global.gini_OLS = class {
	static bf = `${h2}/gini_OLS/`;
	static input_gini_premodern_csv = `${h1}/gini_Eoscala/gini_-21500_1800.csv`;
	static input_gini_modern_csv = `${h1}/gini_Eoscala/gini_1800_2018.csv`;
	static input_gini_subngini_json = () => gini_SubNGini.output_areal_json
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
	
	static getEoscalaGiniObject () {
		//Declare local instance variables
		let gini_array = File.loadCSVAsArray(this.input_gini_premodern_csv, {
			delimiter: ",",
			mode: "vertical"
		});
		let processed_array = [];
		
		//Destructure gini_array into processed_array
		for (let i = 0; i < gini_array.length; i++) {
			//Parse gini_array[i]
			Object.iterate(gini_array[i], (local_key, local_value) => {
				if (local_value === "") {
					delete gini_array[i][local_key];
				} else {
					let local_number = parseFloat(local_value);
					
					if (!isNaN(local_number)) gini_array[i][local_key] = local_number;
				}
			});
			
			let local_coords = [gini_array[i]["Longitude"], gini_array[i]["Latitude"]];
			let local_gini = (gini_array[i]["Income Gini"] || gini_array[i]["Wealth Gini"]); //Historically, these proxy the same thing
			
			//Push to processed_array
			processed_array.push({
				name: gini_array[i]["Site"],
				coords: local_coords,
				gini: local_gini,
				year: gini_array[i]["Year"]
			});
		}
		
		//Return statement
		return processed_array;
	}
	
	static getGapminderGiniObject () {
		//Declare local instance variables
		let csv_obj = File.loadCSVAsJSON(this.input_gini_modern_csv, {
			delimiter: ",",
			mode: "vertical"
		});
		let gini_obj = {};
		
		//Iterate over csv_obj
		Object.iterate(csv_obj, (local_key, local_value) => {
			let local_gini_obj = {};
			
			for (let i = 0; i < local_value.time.length; i++)
				local_gini_obj[local_value.time[i]] = parseFloat(local_value["Gini"][i])/100;
			
			gini_obj[local_key.toUpperCase()] = local_gini_obj;
		});
		
		//Return statement
		return gini_obj;
	}
	
	static getSubNGiniObject () {
		//Return statement
		return JSON.parse(fs.readFileSync(this.input_gini_subngini_json(), "utf8"));
	}
};