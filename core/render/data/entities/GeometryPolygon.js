if (!global.naissance) global.naissance = {};
naissance.GeometryPolygon = class extends naissance.Geometry {
	constructor (arg0_id, arg1_value) {
		super(arg0_id, arg1_value);
		this.class_name = "GeometryPolygon";
	}
	
	async draw (arg0_value) {
		//Convert from parameters
		let value = (arg0_value) ? arg0_value : this.value;
		
		//1. Remove geometry first
		if (this.geometry) this.geometry.remove();
		this.geometry = undefined;
		
		//2. Derender check
		if (this.canDerender(value)) { this.removeGeometries(); return; }
		if (this.canRemove(value)) { this.remove(); return; }
		
		//3. Draw geometry
		if (this.value[0]) this.geometry = maptalks.Geometry.fromJSON(this.value[0]);
		if (this.value[1]) this.geometry.setSymbol(this.value[1]);
		main.layers.entity_layer.addGeometry(this.geometry);
	}
};