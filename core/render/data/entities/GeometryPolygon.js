if (!global.naissance) global.naissance = {};
naissance.GeometryPolygon = class extends naissance.Geometry {
	constructor (arg0_id, arg1_value) {
		super(arg0_id, arg1_value);
		this.class_name = "GeometryPolygon";
		this.label_geometries = [];
	}
	
	async _drawLabels () {
		if (this.value[2]) {
			//Declare local instance variables
			let default_symbol = {
				textFaceName: "Karla",
				textFill: "white",
				textHaloFill: "black",
				textHaloRadius: 2,
				textSize: 14
			};
			let hide_labels_under_km2 = Math.returnSafeNumber(main.settings?.hide_labels_under_km2, 1000);
			
			//Fetch this.value[2].label_coordinates, this.value[2].label_name/name, this.value[2].label_symbol
			if (this.geometry && !this.value[2]?.label_symbol?.hide) {
				let label_geometries = (this.value[2].label_geometries) ?
					this.value[2].label_geometries : [];
				let label_name = this.getName();
				
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
							
							textFaceName: default_symbol.textFaceName,
							textFill: default_symbol.textFill,
							textHaloFill: default_symbol.textHaloFill,
							textHaloRadius: default_symbol.textHaloRadius,
							textSize: default_symbol.textSize,
							...this.value[2].label_symbol
						});
						
						if (main.settings.hide_labels_by_default)
							this.label_geometries[i].hide();
					}
					if (local_label_geometry.area !== undefined)
						local_label_geometry.setZIndex(-local_label_geometry.area);
					local_label_geometry.addTo(main.layers.label_collision_layer);
				}
			}
		}
	}
	
	async draw () {
		//Convert from parameters
		let value = this.value;
		
		//1. Remove geometry first
		if (this.geometry) this.geometry.remove(); this.geometry = undefined;
		if (this.label_geometries)
			for (let i = this.label_geometries.length - 1; i >= 0; i--) {
				this.label_geometries[i].remove();
				this.label_geometries.splice(i, 1);
			}
		
		//2. Derender check
		if (this.canDerender(value)) { this.removeGeometries(); return; }
		if (this.canRemove(value)) { this.remove(); return; }
		
		//3. Draw geometry
		if (this.value[0]) {
			this.geometry = maptalks.Geometry.fromJSON(this.value[0]);
			this._drawLabels();
			
			this.geometry.addEventListener("click", async () => {
				if (this.window) this.window.close();
				this.window = veWindow(await this.getGeometryInterface(), {
					name: this.getName(),
					width: "30rem"
				});
			});
		}
		if (this.value[1]) this.geometry.setSymbol(this.value[1]);
		main.layers.entity_layer.addGeometry(this.geometry);
	}
};