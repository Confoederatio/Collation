if (!global.naissance) global.naissance = {};
naissance.Geometry = class extends ve.Class {
	static instances = {};
	static reserved_keys = ["name"];
	
	constructor () {
		super();
		
		this.id = Class.generateRandomID(naissance.Geometry);
		this.instance = this;
		this.metadata = {};
		
		//Push to naissance.Geometry.instances
		naissance.Geometry.instances[this.id] = this;
	}
};