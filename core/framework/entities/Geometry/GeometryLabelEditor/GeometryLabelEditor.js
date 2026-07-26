if (!global.naissance) global.naissance = {};

/**
 * - `.geometries`: Array<maptalks.Geometry> - Any currently rendered geometries.
 * - `.geometry`: maptalks.Geometry - The parent geometry this GeometryLabelEditor is anchored to.
 * - `.label_geometries`: Array<Object>
 *   - `.geometry`: Geospatiale.maptalks_CurvedText|maptalks.Geometry
 *   - `.options`: Object
 *     - `.length`: number - Any positive length results in truncation.
 *     - `.symbol_obj`: Object
 *     - `.type`: string - Either 'curved'/'straight'.
 * 
 * @type {naissance.GeometryLabelEditor}
 */
naissance.GeometryLabelEditor = class {
	constructor (arg0_geometry, arg1_label_geometries) {
		//Convert from parameters
		let geometry = arg0_geometry;
		let label_geometries = (arg1_label_geometries) ? arg1_label_geometries : [];
		
		//Declare local instance variables
		this.geometry = geometry;
		this.interfaces = {};
		this.label_geometries = [];
		this.selected_geometries = [];
		this.selected_indexes = [];

		//Initialize label geometries if they exist as JSON
		for (let i = 0; i < label_geometries.length; i++) {
			let local_label = label_geometries[i];
			let local_geometry = maptalks.Geometry.fromJSON(local_label);
			
			this.label_geometries.push({
				geometry: local_geometry,
				options: local_label.options || { type: "straight", symbol_obj: local_geometry.getSymbol() }
			});
		}
	}
	
	addLabelGeometry (arg0_coords, arg1_options) {
		//Convert from parameters
		let coords = (arg0_coords) ? arg0_coords : map.getCenter();
		let options = (arg1_options) ? arg1_options : {};
		
		//Initialise options
		if (!options.symbol_obj) options.symbol_obj = (this.geometry.getLayer()) ? 
			naissance.Renderer.getDefaultLabelSymbol() : {};
		if (!options.type) options.type = "straight";
		if (!options.symbol_obj.textName) options.symbol_obj.textName = "New Label";
		
		//Declare local instance variables
		let geometry_obj = { options };
		
		if (options.type === "straight") {
			geometry_obj.geometry = new maptalks.Marker(coords, {
				symbol: options.symbol_obj
			});
		}
		
		//Push this.label_geometries to render
		this.label_geometries.push(geometry_obj);
		this.draw();
		this.save();
		
		//Open UI for the newly created label
		this.drawLabelGeometryUI(this.label_geometries.length - 1);
	}
	
	/**
	 * Draws attached label_geometries with selection editing.
	 */
	draw () {
		for (let i = 0; i < this.label_geometries.length; i++) {
			let label_obj = this.label_geometries[i];
			let local_marker = label_obj.geometry;
			
			if (!local_marker.getLayer()) {
				local_marker.addTo(main.layers.label_layer);
				local_marker.config("draggable", true);
				
				local_marker.on("click", (e) => {
					this.select(i);
					this.drawLabelGeometryUI(i);
				});
				
				local_marker.on("dragend", (e) => {
					this.save();
				});
			}
		}
	}
	
	drawLabelGeometryUI (arg0_index) {
		//Convert from parameters
		let index = arg0_index;
		let label_obj = this.label_geometries[index];
		if (!label_obj) return;
		
		if (this.interfaces[index]) this.interfaces[index].remove();
		this.interfaces[index] = new ve.Window({
			add_label: veButton(() => {
				this.addLabelGeometry(label_obj.geometry.getCoordinates(), { 
					symbol_obj: {
						textName: this.geometry.name
					}
				});
			}, { name: "Add Label" }),
			text_input: veText(label_obj.options.symbol_obj.textName || "", {
				name: "Label Text",
				onuserchange: (v) => {
					label_obj.options.symbol_obj.textName = v;
					label_obj.geometry.setSymbol(label_obj.options.symbol_obj);
					this.save();
				}
			}),
			font_size: veNumber(label_obj.options.symbol_obj.textSize || 12, {
				name: "Font Size",
				min: 0,
				onuserchange: (v) =>  {
					label_obj.options.symbol_obj.textSize = v;
					label_obj.geometry.setSymbol(label_obj.options.symbol_obj);
					this.save();
				}
			}),
			delete_label: veButton(() => {
				this.removeLabelGeometry(index);
				if (this.interfaces[index]) this.interfaces[index].remove();
			},  { name: "Delete Label" })
		}, { name: (this.geometry?.name || "Edit Label (" + index + ")") });
	}

	save () {
		if (this.geometry?._parent_entity) {
			let parent_entity = this.geometry._parent_entity;
			let serialized_labels = [];
			
			for (let i = 0; i < this.label_geometries.length; i++) {
				let local_json = this.label_geometries[i].geometry.toJSON();
				local_json.options = this.label_geometries[i].options;
				serialized_labels.push(local_json);
			}
			
			//Update current frame data
			parent_entity.value[2].label_geometries = serialized_labels;
			
			//Trigger history keyframe update so map state persists
			parent_entity.addKeyframe(main.date, undefined, parent_entity.value[1], parent_entity.value[2]);
		}
	}
	
	removeLabelGeometry (arg0_index) {
		//Convert from parameters
		let index = arg0_index;
		let remove_geometry = this.label_geometries[index];
		
		if (remove_geometry) {
			let selected_index = this.selected_indexes.indexOf(index);
			if (selected_index !== -1)
				this.selected_indexes.splice(selected_index, 1);
			
			remove_geometry.geometry.remove();
			this.label_geometries.splice(index, 1);
			
			this.save();
			this.draw();
		}
	}
	
	select (arg0_index) {
		let index = arg0_index;
		if (!this.selected_indexes.includes(index))
			this.selected_indexes.push(index);
	}
	
	remove () {
		for (let i = 0; i < this.label_geometries.length; i++)
			this.label_geometries[i].geometry.remove();
		for (let i = 0; i < this.selected_geometries.length; i++)
			this.selected_geometries[i].remove();
		this.selected_geometries = [];
		Object.iterate(this.interfaces, (local_key, local_value) => local_value.remove());
	}
};