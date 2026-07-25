if (!global.naissance) global.naissance = {};

/**
 * - `.label_geometries`: {@link Array}<{@link Object}>
 *   - `.geometry`: {@link naissance.Geometry}
 *   - `.type`: {@link string} - Either 'curved'/'straight'.
 * 
 * @type {naissance.GeometryLabelEditor}
 */
naissance.GeometryLabelEditor = class {
	constructor (arg0_label_geometries) {
		//Convert from parameters
		let label_geometries = (arg0_label_geometries) ? arg0_label_geometries : [];
		
		//Declare local instance variables
		this.label_geometries = [];
		this.selected_geometries = []; //Indexes of selected_geometries
	}
	
	addLabelGeometry (arg0_options) {
		
	}
	
	/**
	 * Draws attached label_geometries with selection editing.
	 */
	draw () {
		
	}
	
	removeLabelGeometry (arg0_index) {
		//Convert from parameters
		let index = arg0_index;
		
		//Splice and remove
		let remove_geometry = this.label_geometries[index];
		
		if (remove_geometry) {
			remove_geometry.geometry.remove();
			this.label_geometries.splice(index, 1);
			this.draw();
		}
	}
	
	select (arg0_index) {
		//Convert from parameters
		let index = arg0_index;
		
	}
	
	remove () {
		
	}
};