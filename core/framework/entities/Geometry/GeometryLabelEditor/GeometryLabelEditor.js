if (!global.naissance) global.naissance = {};

/**
 * - `.geometry`: {@link maptalks.Geometry}
 * - `.label_geometries`: {@link Array}<{@link Object}>
 *   - `.geometry`: {@link naissance.Geometry}
 *   - `.options`: {@link Object}
 *     - `.length`: {@link number} - Any positive length results in truncation.
 *   - `.type`: {@link string} - Either 'curved'/'straight'.
 * 
 * @type {naissance.GeometryLabelEditor}
 */
naissance.GeometryLabelEditor = class {  //[WIP] - Finish class body
	constructor (arg0_geometry, arg1_label_geometries) {
		//Convert from parameters
		let geometry = arg0_geometry;
		let label_geometries = (arg1_label_geometries) ? arg1_label_geometries : [];
		
		//Declare local instance variables
		this.geometry = geometry;
		this.interfaces = {};
		this.label_geometries = [];
		this.selected_geometries = [];
		this.selected_indexes = []; //Indexes of selected_indexes
	}
	
	addLabelGeometry (arg0_coords, arg1_options) {
		//Convert from parameters
		let coords = arg0_coords;
		let options = (arg1_options) ? arg1_options : {};
	}
	
	/**
	 * Draws attached label_geometries with selection editing.
	 */
	draw () {
		
	}
	
	drawLabelGeometryUI (arg0_index) {
		//Convert from parameters
		let index = arg0_index;
		
		if (this.interfaces[index]) this.interfaces[index].remove();
		this.interfaces[index] = new ve.Window({
			
		}, { name: (this.geometry?.name || "Edit Labels") });
	}
	
	removeLabelGeometry (arg0_index) {
		//Convert from parameters
		let index = arg0_index;
		
		//Splice and remove
		let selected_index = this.selected_indexes.indexOf(index);
		let remove_geometry = this.label_geometries[index];
		
		if (remove_geometry) {
			if (selected_index !== -1)
				this.selected_indexes.splice(selected_index, 1);
			
			remove_geometry.geometry.remove();
			this.label_geometries.splice(index, 1);
			this.draw();
		}
	}
	
	select (arg0_index) {
		//Convert from parameters
		let index = arg0_index;
		
		//Add to selected_indexes
		if (!this.selected_indexes.includes(index))
			this.selected_indexes.push(index);
	}
	
	remove () {
		//Iterate over all this.label_geometries; this.selected_geometries and remove them
		for (let i = 0; i < this.label_geometries.length; i++)
			this.label_geometries[i].geometry.remove();
		for (let i = 0; i < this.selected_geometries.length; i++)
			this.selected_geometries[i].remove();
		this.selected_geometries = [];
		
		//Iterate over all this.interfaces and remove local_value
		Object.iterate(this.interfaces, (local_key, local_value) => local_value.remove());
	}
};