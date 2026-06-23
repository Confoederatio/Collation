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
		
		let filter_obj = timeline_obj.options.filter;
			if (filter_obj?.date_window) {
				filter_obj.date_window[0] = Date.getTimestamp(filter_obj.date_window[0]);
				filter_obj.date_window[1] = Date.getTimestamp(filter_obj.date_window[1]);
				filter_obj.date_window.sort((a, b) => a - b); //Sort in ascending order
			}
			
		//Push table_array header
		table_array.push(["Date", "Keyframe"]);
		
		//Iterate over .options.timeline_instance.keyframes; operate over .options.filter
		Object.iterate(timeline_obj.keyframes, (local_key, local_value) => {
			//Check against filter_obj
			let display_keyframe = false;
			let local_groups = (local_value.groups) ? local_value.groups : [];
			let local_timestamp = parseFloat(local_key);
			
			//Check for filter_obj pass
			if (filter_obj.enabled) {
				if (filter_obj.groups.length > 0)
					for (let i = 0; i < filter_obj.groups.length; i++)
						if (local_groups.includes(filter_obj.groups[i])) {
							display_keyframe = true;
							break;
						}
				if (filter_obj?.date_window)
					if (local_timestamp < filter_obj.date_window[0] || local_timestamp > filter_obj.date_window[1])
						display_keyframe = false;
			} else {
				display_keyframe = true;
			}
			
			//Render keyframe if display_keyframe is true
			if (display_keyframe) {
				let local_keyframe_el = document.createElement("div");
				
				if (local_value.name) {
					let local_name_el = document.createElement("div");
						local_name_el.setAttribute("class", "keyframe-name");
						local_name_el.innerHTML = local_value.name;
						local_keyframe_el.appendChild(local_name_el);
				}
				if (local_value.description) {
					let local_description_el = document.createElement("div");
						local_description_el.setAttribute("class", "keyframe-description");
						local_description_el.innerHTML = local_value.description;
						local_keyframe_el.appendChild(local_description_el);
				}
				
				//Push to table_array
				table_array.push([String.formatDate(local_timestamp), local_keyframe_el]);
			}
		});
		
		//Set table .v
		this.table.v = table_array;
	}
};