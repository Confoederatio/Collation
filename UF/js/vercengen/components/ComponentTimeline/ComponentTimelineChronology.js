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
		
		//Declare table and draw
		this.table = new ve.Table([], {
			...this.options.table_options
		});
		
		this.from_binding_fire_silently = true;
		this.v = value;
		delete this.from_binding_fire_silently;
	}
	
	get v () {
		//Return statement
		return Date.getDate(this.value);
	}
	
	set v (arg0_date) {
		//Convert from parameters
		let date = arg0_date;
		
		//Declare local instance variables
		this.timestamp = Date.getTimestamp(date);
		this.value = Date.getDate(date);
		
		//Update draw
		this.draw();
		this.fireFromBinding();
	}
	
	draw () {
		//Declare local instance variables
		let table_array = [];
		let timeline_obj = this.options.timeline_instance;
		
		//Iterate over .options.timeline_instance.keyframes; operate over .options.filter
		Object.iterate(timeline_obj.keyframes, (local_key, local_value) => {
			
		});
		
		//Set table .v
	}
};