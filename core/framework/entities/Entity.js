if (!global.naissance) global,naissance = {};
naissance.Entity = class extends ve.Class {
	constructor (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
			super();
		
		//Declare local instance variables
		this.instance = this;
	}
	
	drawHierarchyDatatype (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Declare local instance variables
		let all_geometries;
		let attributes_obj = {};
		let hierarchy_obj = {};
		let symbol_obj = (naissance[this.class_name].hierarchy_symbol || {});
		
		let symbol_name = (symbol_obj.name) ? symbol_obj.name : this.class_name;
		
		//Geometry: Keyframe handling
		
		//Feature: this.entities handling
		if (this.entities) {
			all_geometries = this.getAllGeometries();
			
			//Set Feature attributes
			attributes_obj["data-entities"] = this.entities.length;
			
			//Delete any self-references; already assigned entities with other .parent
			for (let i = this.entities.length - 1; i >= 0; i--)
				if (this.entities[i].class_name === "FeatureGroup" && this.entities[i].id === this.id) {
					console.warn(`Deleting self-reference`, this.entities[i], `from`, this);
					this.entities.splice(i, 1);
				} else if (this.entities[i].parent && this.entities[i].parent.id !== this.id) {
					this.entities.splice(i, 1);
				}
			
			//Iterate over this.entities and call .draw() recursively where valid
			if (!this.is_collapsed)
				for (let i = 0; i < this.entities.length; i++) {
					let local_entity = this.entities[i];
					let local_key = `${local_entity.class_name}-${local_entity.id}`;
					
					//naissance.FeatureGroup, naissance.FeatureLayer handling
					if (local_entity instanceof naissance.Feature && local_entity.drawHierarchyDatatype) {
						hierarchy_obj[local_key] = local_entity.drawHierarchyDatatype(options);
					} else {
						//naissance.Feature generic handling
						if (options.hide_features) continue; //Internal guard clause if features are meant to be hidden
						if (local_entity instanceof naissance.Feature) {
							hierarchy_obj[local_key] = new ve.HierarchyDatatype({
								icon: new ve.HTML(`<icon>inventory_2</icon>`, {
									tooltip: local_entity.class_name } )
							}, { instance: local_entity });
						}
						//naissance.Geometry generic handling
						if (options.hide_geometries) continue; //Internal guard clause if geometries are meant to be hidden
						if (local_entity instanceof naissance.Geometry) {
							if (local_entity.drawHierarchyDatatype) {
								hierarchy_obj[local_key] = local_entity.drawHierarchyDatatype();
							} else { //[WIP] - Implement naissance.Geometry.name accessor
								hierarchy_obj[local_key] = new ve.HierarchyDatatype({
									icon: new ve.HTML(`<icon>shapes</icon>`, {
										tooltip: local_entity.class_name } )
								}, {
									instance: local_entity,
									name: local_entity.name,
									name_options: {
										onprogramchange: () => {
											this.drawHierarchyDatatype();
										},
										onuserchange: (v) => {
											local_entity.name = v;
										}
									}
								});
							}
						}
					}
				}
		}
		
		//Return statement
		return new ve.HierarchyDatatype({
			icon: new ve.HTML(`${(symbol_obj.icon) ? `<icon>${symbol_obj.icon}</icon>` : ""}`, {
				tooltip: `${symbol_name}${(all_geometries) ? ` (${String.formatNumber(all_geometries.length)} Items)` : ""}`,
			}),
			
			edit: veButton(() => {
				this.open("instance", {
					id: this.id,
					name: this.name,
					width: "24rem"
				});
				this.draw();
			}, {
				attributes: { class: "order-99" },
				name: "<icon>more_vert</icon>",
				tooltip: `Edit ${symbol_name}`,
			}),
			
			...hierarchy_obj
		}, {
			attributes: {
				...attributes_obj,
				"data-type": this.class_name
			},
			instance: this,
			is_collapsed: this.is_collapsed,
			name: this.name,
			name_options: {
				onchange: (v) => {
					this.name = v;
					this.drawHierarchyDatatype();
				}
			},
			oncollapse: (v, e) => {
				this.is_collapsed = v;
				if (v === false)
					UI_LeftbarHierarchy.refresh();
			},
			type: (!this.entities) ? "item" : "group"
		})
	}
	
	static drawHierarchyDatatype_FeatureSketchMap () {
		//Declare local instance variables
		this.interface = new ve.HierarchyDatatype({
			icon: new ve.HTML(`<icon>app_registration</icon>`),
			...this.drawHierarchyDatatypeGenerics(),
			edit: veButton(() => {
				this.open("instance", {
					id: this.id,
					name: this._name,
					width: "24rem"
				});
				this.draw();
			}, {
				name: "<icon>more_vert</icon>",
				tooltip: "Edit Sketch Map",
				style: { order: 100, padding: 0 }
			})
		}, {
			ignore_component: true,
			instance: this,
			name: this.name,
			name_options: {
				onchange: (v) => {
					this.name = v;
					this.drawHierarchyDatatype();
				}
			},
			type: "item",
			style: {
				".nst-content": {
					paddingRight: 0
				},
				"[component='ve-button'] > button": {
					border: 0
				}
			}
		});
		
		//Return statement
		return this.interface;
	}
	
	static drawHierarchyDatatype_FeatureTileLayer () {
		//Declare local instance variables
		let preset_options = {};
		let presets_obj = config.features.tile_layer.tilemap_presets;
		
		//Populate preset_options
		Object.iterate(presets_obj, (local_key, local_value) => {
			preset_options[local_key] = {
				name: local_value.name,
				selected: (this.options.preset === local_key)
			};
		});
		
		//Return this.interface
		this.interface = new ve.HierarchyDatatype({
			icon: new ve.HTML(`<icon>${(this.is_base_layer) ? "map" : "view_module"}</icon>`, { tooltip: (this.is_base_layer) ? "Base FeatureTileLayer" : "FeatureTileLayer" }),
			...this.drawHierarchyDatatypeGenerics(),
			edit_tile_layer: veButton(() => {
				if (this.tile_layer_window) this.tile_layer_window.close();
				this.tile_layer_window = veWindow({
					opacity: veRange(Math.returnSafeNumber(this.layer?.options?.opacity, 0), {
						name: "Opacity",
						onuserchange: (v) => this._DALS_addOptions({ opacity: v })
					}),
					resolution: veSelect({
						"256/": {
							name: "256",
							selected: true
						},
						"null": {
							name: "512"
						}
					}, {
						name: "Resolution",
						onuserchange: (v) => this._DALS_recalculatePreset(this.options.preset)
					}),
					set_preset: veSelect(preset_options, {
						name: "Tilemap Preset",
						onuserchange: (v) => {
							this.options.preset = v;
							this._DALS_recalculatePreset(this.options.preset);
						}
					}),
					
					advanced_options: veInterface({
						maptiler_key: veText("xWbyIIrJg1lF1fmQFByp", { name: "Maptiler Key" }),
						url_template: veURL("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", {
							name: "URL Template",
							onuserchange: (v) => this._DALS_addOptions({ urlTemplate: v })
						}),
						subdomains: veText(["a", "b", "c", "d"], {
							name: "Subdomains",
							onuserchange: (v) => this._DALS_addOptions({ subdomains: v })
						}),
						
						max_available_zoom: veNumber(0, {
							name: "Max Available Zoom",
							min: -1,
							onuserchange: (v) => this._DALS_addOptions({ maxAvailableZoom: (v > 0) ? v : null })
						}),
						repeat_world: veToggle(false, {
							name: "Repeat World",
							onuserchange: (v) => this._DALS_addOptions({ repeatWorld: v })
						})
					}, { name: "Advanced Options" }),
					
					apply_as_base_layer: veButton(() => this._DALS_applyAsBaseLayer(), { name: "Apply as Base Layer" })
				}, { name: `Edit ${this._name}`, can_rename: false, width: "24rem" });
			}, {
				name: "<icon>more_vert</icon>",
				tooltip: "Edit Tile Layer",
				style: {
					order: 101,
					padding: 0
				}
			})
		}, {
			ignore_component: true,
			instance: this,
			name: this.name,
			name_options: {
				onchange: (v) => {
					this.name = v;
					this.drawHierarchyDatatype();
				}
			},
			type: "item",
			style: {
				".nst-content": {
					paddingRight: 0
				},
				"[component='ve-button'] > button": {
					border: 0
				}
			}
		});
		
		//Return statement
		return this.interface;
	}
};