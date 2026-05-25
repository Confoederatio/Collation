if (!global.naissance) global.naissance = {};
/**
 * {@link naissance.HistoryKeyframe} data structure:
 * - [0]: arg0_coords:{@link Object}<{@link Array}<{@link float}, {@link float}>> - Contains the maptalks coordinates.
 * - [1]: arg1_symbol:{@link Object} - Contains the maptalks symbol.
 * - [2]: arg2_data:{@link Object}
 * 
 * @type {naissance.GeometryPolygon}
 */
naissance.GeometryPolygon = class extends naissance.Geometry {
	constructor () {
		super();
		
		//Declare local instance variables
		this.class_name = "GeometryPolygon";
		this.label_geometries = [];
		this.node_editor_mode = "Polygon";
		
		//KEEP AT BOTTOM!
		this.updateOwner();
	}
	
	_drawLabels () {
		if (this.value[2]) { //[WIP] - Refactor labelling logic at a later date
			//Declare local instance variables
			let brush_symbol = main.brush.getBrushSymbol();
			let hide_labels_under_km2 = Math.returnSafeNumber(main.settings.hide_labels_under_km2, 1000);
			
			//Fetch this.value[2].label_coordinates, this.value[2].label_name/name, this.value[2].label_symbol
			if (this.geometry && !this.value[2]?.label_symbol?.hide) {
				let label_geometries = (this.value[2].label_geometries) ?
					this.value[2].label_geometries : [];
				let label_name = (this.value[2].label_name) ?
					this.value[2].label_name : this.value[2].name;
				
				//1. .label_coordinates
				if (label_geometries.length === 0) {
					if (!this.geometry.getGeometries) {
						this.label_geometries[0] = new maptalks.Marker(this.geometry.getCenter());
						this.label_geometries[0].area = this.geometry.getArea();
					} else {
						let all_geometries = this.geometry.getGeometries();
						
						for (let i = 0; i < all_geometries.length; i++) {
							let local_area = all_geometries[i].getArea();
							if (local_area < hide_labels_under_km2*1000000 && i > 0) continue; //Internal guard clause for small exclaves <1000km^2
							
							let local_label_geometry = new maptalks.Marker(all_geometries[i].getCenter());
							local_label_geometry.area = local_area;
							this.label_geometries.push(local_label_geometry);
						}
					}
				} else {
					for (let i = 0; i < label_geometries.length; i++)
						this.label_geometries[i] = maptalks.Geometry.fromJSON(label_geometries[i]);
				}
				
				//Iterate over all this.label_geometries, apply settings
				for (let i = 0; i < this.label_geometries.length; i++) {
					let local_label_geometry = this.label_geometries[i];
					if (!local_label_geometry) continue;
					
					//2. .label_name/.name
					if (label_geometries.length === 0) {
						this.label_geometries[i].setSymbol({
							textName: label_name,
							
							textFaceName: brush_symbol.textFaceName,
							textFill: brush_symbol.textFill,
							textHaloFill: brush_symbol.textHaloFill,
							textHaloRadius: brush_symbol.textHaloRadius,
							textSize: brush_symbol.textSize,
							...this.value[2].label_symbol
						});
						
						if (main.settings.hide_labels_by_default)
							this.label_geometries[i].hide();
					}
					if (local_label_geometry.area !== undefined)
						local_label_geometry.setZIndex(-local_label_geometry.area);
					local_label_geometry.addTo(main.layers.label_layer);
				}
			}
		}
	}
	
	async draw (arg0_value) {
		//Convert from parameters
		let value = arg0_value;
		if (value === undefined) return;
		
		//Declare local instance variables
		if (this.geometry) this.geometry.remove();
		if (this.selected_geometry) this.selected_geometry.remove();
		if (this.label_geometries)
			for (let i = this.label_geometries.length - 1; i >= 0; i--) {
				this.label_geometries[i].remove();
				this.label_geometries.splice(i, 1);
			}
		this.geometry = undefined;
		this.selected_geometry = undefined;
		this.value = value;
		
		if (this.value) {
			//1. Check any cause for derendering
			if (this.value && !this.value[0]) return;
			if (this.value && this.value[2]) {
				if (this.value[2].hidden) return;
				if (this.value[2].max_zoom && map.getZoom() > this.value[2].max_zoom) return;
				if (this.value[2].min_zoom && map.getZoom() < this.value[2].min_zoom) return;
			}
			
			this.geometry = maptalks.Geometry.fromJSON(this.value[0]);
			if (this.value[1]) this.geometry.setSymbol(this.value[1]);
			
			//2. Draw this.selected_geometry
			if (this.geometry) {
				this.geometry.addEventListener("click", (e) => {
					if (!["fill_tool", "node", "node_override", "node_transfer"].includes(main.brush.mode)) {
						this.history.draw(this.keyframes_ui);
						super.open("instance", { name: this.name, ...this.window_options });
					}
				});
				main.layers.entity_layer.addGeometry(this.geometry);
				
				//3. Draw labels
				this._drawLabels();
				
				//4. Draw selection
				try {
					if (this.selected) {
						this.selected_geometry = this.geometry.copy();
						this.selected_geometry.setSymbol({
							lineColor: `rgb(255, 255, 0)`,
							lineDasharray : (main.brush.selected_geometry?.id !== this.id) ? [10, 10, 10] : undefined,
							lineOpacity: 0.5,
							lineWidth: 4
						});
						main.layers.selection_layer.addGeometry(this.selected_geometry);
					}
				} catch (e) { console.error(e); }
			}
		} else { console.warn(`this.value:`, this.value, value); }
	}
};