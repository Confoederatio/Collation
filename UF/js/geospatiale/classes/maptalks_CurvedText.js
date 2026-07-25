if (!global.Geospatiale)
	global.Geospatiale = {};

Geospatiale.ArcCurve = class {
	constructor (arg0_coords, arg1_options) {
		//Convert from parameters
		let coords = arg0_coords;
		let options = (arg1_options) ? arg1_options : {};
		
		//Declare local instance variables
		this.coords = coords;
		this.layer  = options.layer;
		this.map = options.map;
		this.text_string = options.text_string;
		
		this.base_font_size = Math.returnSafeNumber(options.base_font_size, 16);
		this.base_zoom = (options.base_zoom !== undefined) ? options.base_zoom : map.getZoom();
		this.glyph_markers = [];
		this.symbol_obj = (options.symbol) ? options.symbol : {};
			if (!this.symbol_obj.textSize) this.symbol_obj.textSize = structuredClone(this.base_font_size);
			if (!this.symbol_obj.textFaceName) this.symbol_obj.textFaceName = "sans-serif";
		
		this.canvas = document.createElement("canvas");
		this.ctx = this.canvas.getContext("2d");
		
		//Event handling and initial render
		this.onzoom_handler = this.updateZoom.bind(this);
		this.map.on("zoomend zooming", this.onzoom_handler);
		this.render();
	}
	
	getSmoothPoints (arg0_coords, arg1_samples_per_segment) {
		//Convert from parameters
		let coords = arg0_coords;
		let samples_per_segment = Math.returnSafeNumber(arg1_samples_per_segment, 25);
		
		if (coords.length < 2) return coords; //Internal guard clause
		
		//Declare local instance variables
		let pt_list = [];
		let smooth_points =  [];
		
		//Iterate over coords
		for (let i = 0; i < coords.length; i++) {
			let local_coord = coords[i];
			let local_point = (local_coord.x !== undefined && local_coord.y !== undefined) ?
				[local_coord.x, local_coord.y] : [local_coord[0], local_coord[1]];
			pt_list.push(local_point);
		}
		
		//Iterate over pt_list
		for (let i = 0; i < pt_list.length - 1; i++) {
			let p0 = (i > 0) ? pt_list[i - 1] : pt_list[i];
			let p1 = pt_list[i];
			let p2 = pt_list[i + 1];
			let p3 = (i < pt_list.length - 2) ? pt_list[i + 2] : p2;
			
			//Iterate over samples_per_segment for segment
			for (let t = 0; t < 1; t += 1/samples_per_segment) {
				let t2 = t*t;
				let t3 = t2*t;
				let x = 0.5*((2 * p1[0]) + (-p0[0] + p2[0])*t + (2*p0[0] - 5*p1[0] + 4*p2[0] - p3[0])*t2 + (-p0[0] + 3*p1[0] - 3*p2[0] + p3[0])*t3);
				let y = 0.5*((2 * p1[1]) + (-p0[1] + p2[1])*t + (2*p0[1] - 5*p1[1] + 4*p2[1] - p3[1])*t2 + (-p0[1] + 3*p1[1] - 3*p2[1] + p3[1])*t3);
				smooth_points.push([x, y]);
			}
		}
		smooth_points.push(pt_list[pt_list.length - 1]);
		
		//Return statement
		return smooth_points;
	}
	
	measureTextWidth (arg0_text, arg1_font_size) {
		//Convert from parameters
		let text = (arg0_text) ? arg0_text : "";
		let font_size =  Math.returnSafeNumber(arg1_font_size, this.symbol_obj.textSize);
		
		//Declare local instance variables
		this.ctx.font = `bold ${font_size}px ${this.symbol_obj.textFaceName}`;
		
		let metrics = this.ctx.measureText(text);
		
		//Return statement
		return metrics.width;
	}
	
	render () {
		//Declare local instance variables
		let map_bearing = map.getBearing();
		let sampled_coords = this.getSmoothPoints(this.coords, 25);
		let projected_points = [];
		
		//Iterate over all sampled_coords
		
	}
};