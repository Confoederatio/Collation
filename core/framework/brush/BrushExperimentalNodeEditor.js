if (!global.naissance) global.naissnace = {};
naissance.BrushExperimentalNodeEditor = class extends ve.Class {
	constructor () {
		super();
		
		//Declare local instance variables
		this.coords = [];
		this.mode = "Polygon"; //Either 'Polygon'/'Line'
		this.type = "add"; //Either 'add'/'remove'
		
		map.on("click", (e) => {
			console.log(e);
			this.addNode(e.coordinate);
		});
		map.on("dblclick", (e) => {
			console.log(e);
		});
	}
	
	addNode (arg0_coord) {
		//Convert from parameters
		let coord = arg0_coord;
		
		//Declare local instance variables
		this.coords.push(coord);
		this.draw();
	}
	
	draw () {
		//1. Derender existing geometries
		if (this.geometry) this.geometry.remove();
		
		//2. Add new geometry; make it editable
		this.geometry = new maptalks[this.mode](this.coords);
		this.geometry.addTo(main.layers.cursor_layer);
	}
};