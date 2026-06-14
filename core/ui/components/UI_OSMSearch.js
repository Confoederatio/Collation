global.UI_OSMSearch = class extends ve.Component {
	constructor (arg0_value, arg1_options) {
		//Convert from parameters
		let value = arg0_value;
		let options = (arg1_options) ? arg1_options : {};
			super(options);
		
		//Declare local instance variables
		this.options = options;
		this.value = value;
	}
}