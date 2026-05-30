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
		if (this.value) {
			if (this.value[0] === null) return;
			if (this.value[2]) {
				if (this.value[2].hidden) return;
				if (this.value[2].max_zoom && map.getZoom() > this.value[2].max_zoom) return;
				if (this.value[2].min_zoom && map.getZoom() < this.value[2].min_zoom) return;
			}
		}
		
		//3. Draw geometry
		if (this.value[0]) this.geometry = maptalks.Geometry.fromJSON(this.value[0]);
		if (this.value[1]) this.geometry.setSymbol(this.value[1]);
		main.layers.entity_layer.addGeometry(this.geometry);
	}
};