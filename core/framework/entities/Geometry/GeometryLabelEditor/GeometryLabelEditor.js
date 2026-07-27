if (!global.naissance) global.naissance = {};

/**
 * Label editor bound to a {@link naissance.Geometry} entity.
 * 
 * ##### Instance:
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
	}
	
	deselect (arg0_index) {
		//Convert from parameters
		let index = arg0_index;
		
		//Iterate over all selected_indexes and splice matches
		for (let i = this.selected_indexes.length - 1; i >= 0; i--)
			if (this.selected_indexes[i] === index)
					this.selected_indexes.splice(i, 1);
		this.drawSelectedGeometries();
	}
	
	drawSelectedGeometries () {
		//Clear currently rendered this.selected_geometries
		for (let i = 0; i < this.selected_geometries.length; i++)
			this.selected_geometries[i].remove();
		this.selected_geometries = [];
		
		if (this.geometry.selected)
			for (let i = 0; i < this.selected_indexes.length; i++) try {
				let local_geometry = this.geometry.label_geometries[this.selected_indexes[i]];
				let local_selected_geometry = local_geometry.copy();
				
				local_selected_geometry.setSymbol({
					...local_geometry.getSymbol(),
					textHaloFill: `rgba(255, 255, 0, 0.5)`,
					textHaloRadius: 4
				});
				main.layers.selection_layer.addGeometry(local_selected_geometry);
				this.selected_geometries.push(local_selected_geometry);
			} catch (e) { console.error(e); }
	}
	
	handleEvents () {
		//Attach event handles
		if (this?.geometry?.label_geometries)
			for (let i = 0; i < this.geometry.label_geometries.length; i++) {
				let local_geometry = this.geometry.label_geometries[i];
				
				local_geometry.on("click", () => {
					if (!this.selected_indexes.includes(i)) {
						this.select(i);
					} else {
						this.deselect(i);
					}
				});
			}
	}
	
	open () {
		//Declare local instance variables
		let default_label_symbol = {
			...main.settings.default_label_symbol,
			...(this.value?.[1]?.label_symbol || {})
		};
		
		if (this.window) this.window.close();
		this.window = veWindow({
			actions_bar: veInterface({
				menu: veRawInterface({
					add_straight_label: veButton(() => {
						this.addLabelGeometry(map.getCenter(), {
							symbol_obj: {
								textName: this.geometry.name
							}
						});
					}, { name: "Add Label (Straight)" }),
					add_curved_label: veButton(() => {
					}, { name: "Add Label (Curved)" })
				})
			}, { name: "Label Actions", open: true }),
			
			edit_selected_labels: new UI_LabelSymbol(default_label_symbol, {
				name: "Edit Selected Labels",
				special_function: (v) => {
					let label_geometries = this.geometry.label_geometries;
					let saved_label_data = this.geometry.value?.[2]?.label_geometries;
					
					if (label_geometries && saved_label_data) {
						for (let i = 0; i < this.selected_indexes.length; i++) {
							let local_index = this.selected_indexes[i];
							let local_geometry = label_geometries[local_index];
							let local_json = saved_label_data[local_index];
							
							if (local_geometry && local_json) {
								//Update live geometry
								let new_symbol = {
									...local_geometry.getSymbol(),
									...v
								};
								
								//Update the JSON storage so it persists through draw() calls
								if (!local_json.options) local_json.options = {};
									local_json.options.symbol_obj = new_symbol;
									local_json.symbol = new_symbol;
							}
						}
						
						//Update keyframe; redraw
						this.updateKeyframe();
						if (this.geometry) this.geometry.draw();
						this.drawSelectedGeometries();
					}
				}
			}),
			selection: veInterface({
				menu: veRawInterface({
					clear_selection: veButton(() => {
						this.selected_indexes = [];
						this.drawSelectedGeometries();
						
						veToast(`Cleared selected labels.`);
					}, { name: "Clear Selection" }),
					delete_selected_labels: veButton(() => {
						for (let i = this.selected_indexes.length - 1; i >= 0; i--)
							this.removeLabelGeometry(this.selected_indexes[i]);
						this.selected_indexes = [];
						if (this.geometry) this.geometry.draw();
						
						veToast(`Deleted ${String.formatNumber(this.selected_indexes.length)} selected labels.`);
					}, { name: "Delete Selected Labels" })
				})
			}, { name: "Selection", open: true })
		}, {
			can_rename: false,
			name: `Edit Labels (${this.geometry.name})`,
			width: "20rem"
		});
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
			this.updateKeyframe();
		}
	}
	
	select (arg0_index) {
		//Convert from parameters
		let index = arg0_index;
		
		//Select index if possible
		if (!this.selected_indexes.includes(index))
			this.selected_indexes.push(index);
		this.drawSelectedGeometries();
	}
	
	updateKeyframe () {
		//Declare local instance variables
		let parent_entity = this.geometry;
		
		if (!parent_entity || !parent_entity.is_naissance_geometry) return; //Internal guard clause if parent entity doesn't exist
		
		//Commit keyframe
		let label_geometries = (parent_entity.value?.[2]?.label_geometries || []);
		
		parent_entity.addKeyframe(main.date, undefined, parent_entity.value[1], {
			...parent_entity.value[2],
			label_geometries
		});
	}
};