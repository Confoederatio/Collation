/**
 * Refer to <span color = "yellow">{@link ve.Component}</span> for methods or fields inherited from this Component's parent such as `.options.attributes` or `.element`.
 * 
 * ##### Constructor:
 * - `arg0_value=Date.getCurrentDate()`: {@link number}|{@link Object} - The Date at which to start the Chronology.
 * - `arg1_options`: {@link Object}
 *   - `.timeline_instance`: {@link ve.Timeline}
 * 
 * @type {ve.TimelineChronology}
 */
ve.TimelineChronology = class extends ve.Component {
	constructor (arg0_value, arg1_options) {
		//Convert from parameters
		let value = (arg0_value !== undefined) ? arg0_value : Date.getCurrentDate();
		let options = {
			...arg1_options
		};
			super(options);
			
		//Declare local instance variables
		this.element = document.createElement("div");
			this.element.setAttribute("component", "ve-timeline-chronology");
			this.element.instance = this;
			if (options.attributes) HTML.setAttributesObject(this.element, options.attributes);
		this.options = options;
		this.value = value;
	}
	
	draw () {
		
	}
};