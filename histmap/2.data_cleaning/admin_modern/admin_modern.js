global.admin_modern = class {
	static bf = `${h1}/admin_modern/`;
	static input_geocodes_csv = `${this.bf}geocodes.csv`;
	static input_geocodes_raster = `${this.bf}geocodes.png`;
	
	/**
	 * Returns a map of <r,g,b,a>: {@link Array}<{@link string}> - Ordered in terms of precedence; latter indices are fallbacks.
	 *
	 * @returns {Object}
	 */
	static getColourcodesObject (arg0_year) {
		//Declare local instance variables
		let colourcodes_obj = {};
		let geocodes_csv = File.loadCSVAsJSON(admin_modern.input_geocodes_csv, {
			delimiter: ";",
			mode: "vertical"
		});
		
		//Iterate over geocodes_csv to populate colourcodes_obj with original 'Colour'
		Object.iterate(geocodes_csv, (local_key, local_value) => {
			if (local_value["Colour"][0] !== "")
				colourcodes_obj[local_value["Colour"][0]] = [local_key];
		});
		
		//Iterate over geocodes_csv to populate colourcodes_obj with 'Current Geocodes'
		Object.iterate(geocodes_csv, (local_key, local_value) => {
			if (local_value["Current Geocodes"][0] !== "") {
				let local_geocodes = local_value["Current Geocodes"][0].split(",");
				
				//Iterate over all local_geocodes
				for (let i = 0; i < local_geocodes.length; i++) {
					let local_colour = geocodes_csv[local_geocodes[i]]["Colour"][0];
					
					colourcodes_obj[local_colour].push(local_key);
				}
			}
		});
		
		//Return statement
		return colourcodes_obj;
	}
};