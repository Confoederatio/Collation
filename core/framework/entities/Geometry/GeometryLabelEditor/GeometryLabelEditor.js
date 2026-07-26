if (!global.naissance) global.naissance = {};

/**
 * Label editor bound to a {@link naissance.Geometry} entity.
 *
 * - `.geometry`: {@link naissance.Geometry} - The parent Naissance geometry entity. The rendered {@link maptalks.Geometry} is available as `.geometry.geometry`.
 * - `.interfaces`: {@link Object}
 * - `.label_geometries`: {@link Array}<{@link Object}>
 *   - `.geometry`: {@link Geospatiale.maptalks_CurvedText}|{@link maptalks.Geometry} - The rendered label geometry owned by this editor.
 *   - `.options`: {@link Object}
 *     - `.length`: {@link number} - Any positive length results in truncation.
 *     - `.symbol_obj`: {@link Object} - The maptalks symbol used by the label.
 *     - `.type`: {@link string} - Either 'curved'/'straight'.
 * - `.selected_geometries`: {@link Array}<{@link maptalks.Geometry}> - Reserved for selection overlays.
 * - `.selected_indexes`: {@link Array}<{@link number}> - Selected label indexes.
 *
 * @type {naissance.GeometryLabelEditor}
 */
naissance.GeometryLabelEditor = class {
	constructor (arg0_geometry) {
		//Convert from parameters
		let geometry = arg0_geometry;
		
		//Declare local instance variables
		this.geometry = geometry;
			this.geometry.is_label_editor_open = true;
		this.interfaces = {};
		this.selected_geometries = [];
		this.selected_indexes = [];
		
		//Update label_geometries
		let label_geometries = this.geometry.value?.[2]?.label_geometries;
		if (!label_geometries || label_geometries.length === 0) {
			let center_coords = (this.geometry.geometry) ? this.geometry.geometry.getCenter() : map.getCenter();
			this.addLabelGeometry(center_coords, {
				symbol_obj: {
					textName: this.geometry.name
				}
			});
		}
	}
	
	addLabelGeometry (arg0_coords, arg1_options) {
		//Convert  from parameters
		let coords = arg0_coords;
		let options = (arg1_options) ? arg1_options : {};
		
		//Initialise options
		options.symbol_obj = {
			...naissance.Renderer.getDefaultLabelSymbol(),
			...options.symbol_obj
		};
		if (!options.symbol_obj.textName)
			options.symbol_obj.textName = (this.geometry?.name || "New Label");
		if (!options.type) options.type = "straight";
		
		//Declare local instance variables
		let rendered_geometry = this.geometry?.geometry;
			if (coords === undefined) coords = (rendered_geometry) ? rendered_geometry.getCenter() : map.getCenter();
		
		//Initialise new_marker
		let new_marker = new maptalks.Marker(coords, {
			symbol: options.symbol_obj
		});
		
		let json_obj = new_marker.toJSON();
			json_obj.options = options;
		
		//Ensure .value[2].label_geometries exists
		if (!this.geometry.value) this.geometry.value = [];
		if (!this.geometry.value[2]) this.geometry.value[2] = {};
		if (!this.geometry.value[2].label_geometries) this.geometry.value[2].label_geometries = [];
		let label_geometries = this.geometry.value[2].label_geometries;
			label_geometries.push(json_obj);
			
		//Update keyframe; draw UI
		this.updateKeyframe();
		this.drawLabelGeometryUI(label_geometries.length - 1);
	}
	
	drawLabelGeometryUI (arg0_index) {
		//Convert from  parameters
		let index = arg0_index;
		
		//Declare local instance variables
		let label_geometries = this.geometry.value?.[2]?.label_geometries;
		
		if (!label_geometries || !label_geometries[index]) return; //Internal guard clause if label_geometries doesn't exist
		
		let label_json = label_geometries[index];
			if (!label_json.options) label_json.options = {};
			if (!label_json.options.symbol_obj) label_json.options.symbol_obj = (label_json.symbol || {});
		
		if (this.interfaces[index]) this.interfaces[index].remove();
		this.interfaces[index] = new ve.Window({
			add_label: veButton(() => {
				let local_marker = this.geometry.label_geometries?.[index];
				let coords = (local_marker) ? local_marker.getCoordinates() : map.getCenter();
				this.addLabelGeometry(coords, {
					symbol_obj: {
						textName: this.geometry.name
					}
				});
			}, { name: "Add Label" }),
			text_input: veText(label_json.options.symbol_obj.textName || this.geometry.name || "", {
				name: "Label Text",
				onuserchange: (v) => {
					label_json.options.symbol_obj.textName = v;
					this.updateKeyframe();
				}
			}),
			font_size: veNumber(label_json.options.symbol_obj.textSize || 12, {
				name: "Font Size",
				min: 0,
				onuserchange: (v) => {
					label_json.options.symbol_obj.textSize = v;
					this.updateKeyframe();
				}
			}),
			delete_label: veButton(() => {
				this.removeLabelGeometry(index);
			}, { name: "Delete Label" })
		}, { name: (this.geometry?.name || "Edit Label") + " (" + index + ")" });
	}
	
	remove () {
		//Declare local instance variables
		this.geometry.is_label_editor_open = false;
		
		Object.iterate(this.interfaces, (local_key, local_value) => {
			if (local_value.remove) local_value.remove();
		});
		this.interfaces = {};
		
		//Iterate over all this.selected_geometries and remove them
		for (let i = 0; i < this.selected_geometries.length; i++)
			if (this.selected_geometries[i]) this.selected_geometries[i].remove();
		this.selected_geometries = [];
		
		//Call parent .draw() now that labels are removed
		if (this.geometry && this.geometry.draw)
			this.geometry.draw();
	}
	
	removeLabelGeometry (arg0_index) {
		//Convert from parameters
		let index = arg0_index;
		
		//Declare local instance variables
		let label_geometries = this.geometry.value?.[2]?.label_geometries;
		
		if (label_geometries && label_geometries[index]) {
			let selected_index = this.selected_indexes.indexOf(index);
			if (selected_index !== -1)
				this.selected_indexes.splice(selected_index, 1);
			
			label_geometries.splice(index, 1);
			
			if (this.interfaces[index]) {
				this.interfaces[index].remove();
				delete this.interfaces[index];
			}
			this.updateKeyframe();
		}
	}
	
	select (arg0_index) {
		//Convert from parameters
		let index = arg0_index;
		
		//Select index if possible
		if (!this.selected_indexes.includes(index))
			this.selected_indexes.push(index);
	}
	
	updateKeyframe () {
		//Declare local instance variables
		let parent_entity = this.geometry;
		
		if (!parent_entity || !parent_entity.is_naissance_geometry) return; //Internal guard clause if parent entity doesn't exist
		
		//Commit keyframe
		let label_geometries = parent_entity.value?.[2]?.label_geometries || [];
		parent_entity.addKeyframe(main.date, undefined, parent_entity.value[1], {
			...parent_entity.value[2],
			label_geometries
		});
	}
};