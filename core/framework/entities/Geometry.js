if (!global.naissance) global.naissance = {};
naissance.Geometry = class extends ve.Class {
	static instances = {};
	static reserved_keys = ["name"];
	
	constructor () {
		super();
		
		this.id = Class.generateRandomID(naissance.Geometry);
		this.instance = this;
		this.is_naissance_geometry = true; //Identifier flag for Naissance-bound reflection engine
		this.metadata = {};
		
		//Push to naissance.Geometry.instances
		naissance.Geometry.instances[this.id] = this;
		if (main.brush.selected_feature?.entities) {
			this.parent = main.brush.selected_feature;
			main.brush.selected_feature.entities.push(this);
		}
	}
};