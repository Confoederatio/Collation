if (!global.naissance) global.naissance = {};

naissance.GeometryImage = class extends naissance.Geometry {
	static hierarchy_symbol = {
		icon: "image",
		name: "Image"
	};
	
	constructor () {
		super();
		this.class_name = "GeometryImage";
		
		//Add keyframe with default image upon instantiation
		let brush_symbol = main.brush.getBrushSymbol();
		if (brush_symbol)
			this.addKeyframe(main.date, undefined, brush_symbol);
		
		//Declare local instance variables
		let centre = map.getCenter();
		
		this.initial_centre = [centre.x, centre.y];
		this.initial_zoom = map.getZoom();
		
		this.canvas = document.createElement("canvas");
		this.ctx = this.canvas.getContext("2d");
		this.img_display_size = 400;
		
		this.base_screen_padding = 400;
		this.base_point_radius = 6;
		this.base_hitbox_radius = 20;
		this.buffer_offset = 0;
		this.buffer_scale = 1;
		this.grid_resolution = 20;
		this.image = null;
		this.img_centre = this.img_display_size/2;
		this.max_buffer_size = 8192;
		this.mesh_points = [];
		this.mesh_triangles = [];
		this.selected_point_index = null;
		this.tps_coeffs_x = [];
		this.tps_coeffs_y = [];
		this.world_size = 0;
		
		//Initialise canvas
		this.canvas.width = this.img_display_size + 200;
		this.canvas.height = this.canvas.width;
		this.canvas.style.transformOrigin = "center center";
		this.canvas.style.opacity = Math.returnSafeNumber(brush_symbol.polygonOpacity, 0.45);
		
		//KEEP AT BOTTOM!
		this.updateOwner();
	}
	
	draw () {}
	
	drawUI () {
		//Return statement
		return {
			image_settings: veInterface({
				
			}, { name: "Image Settings", open: true })
		};
	}
	
	getWorldToLngLat (arg0_wx, arg1_wy) {
		//Convert from parameters
		let wx = arg0_wx;
		let wy = arg1_wy;
	}
};