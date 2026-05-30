if (!global.naissance) global.naissance = {};
naissance.Geometry = class extends naissance.Entity {
	constructor (arg0_id, arg1_value) {
		super(arg0_id, arg1_value);
		this.class_name = "Geometry";
	}
	
	canDerender (arg0_value) {
		//Convert from parameters
		let value = (arg0_value) ? arg0_value : this.value;
		
		if (value[2]) {
			if (value[2].max_zoom && map.getZoom() > value[2].max_zoom) return true;
			if (value[2].min_zoom && map.getZoom() < value[2].min_zoom) return true;
		}
	}
	
	canRemove (arg0_value) {
		//Convert from parameters
		let value = (arg0_value) ? arg0_value : this.value;
		
		if (value) {
			if (value[0] === null) return true;
			if (value[2])
				if (value[2].hidden) return true;
		}
	}
	
	remove () {
		this.removeGeometries();
		delete naissance.Entity.instances[this.id];
	}
	
	removeGeometries () {
		if (this.geometry) this.geometry.remove();
		this.geometry = undefined;
	}
};