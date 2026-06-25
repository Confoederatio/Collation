global.UI_Navbar = class {
	constructor () {
		//Declare local instance variables
		this.ui = {};
		
		this.navbar_el = new ve.Navbar({
			file: {
				name: "Project",
				
				open_project_folder: {
					name: "Open Project Folder"
				}
			},
			edit: {
				name: "Edit",
				
				save_snapshot_as_geojson: {
					name: "Save Snapshot (GeoJSON)",
					onclick: () => {
						if (this.save_snapshot_window) this.save_snapshot_window.close();
						this.save_snapshot_window = veWindow({
							file_path: veFile(this.ui.save_snapshot_file_path, {
								onuserchange: (v) => this.ui.save_snapshot_file_path = v,
								save_function: () => {
									//Declare local instance variables
									let file_path = (this.ui.save_snapshot_file_path || "autosave.json");
									let geojson_obj = { type: "FeatureCollection", features: [] };
									let geometries = main.layers.entity_layer.getGeometries();
									
									//Save snapshot
									geometries.forEach((v) => geojson_obj.features.push(v.toGeoJSON()));
									veToast(`Saved GeoJSON snapshot to ${file_path}.`);
									
									//Return statement
									return JSON.stringify(geojson_obj);
								}
							})
						}, {
							name: "Save Snapshot as GeoJSON",
							can_rename: false,
							height: "5rem",
							width: "20rem",
							x: "50dvw - 10rem",
							y: "50dvh - 2.5rem"
						});
					}
				},
				toggle_dev_tools: {
					name: "Toggle Dev Tools",
					keybind: "ctrl+i",
					onclick: () => Blacktraffic.task("electron:toggle-dev-tools")
				},
				undo: {
					name: "Undo",
					keybind: "ctrl+z",
					onclick: () => DALS.Timeline.undo()
				},
				redo: {
					name: "Redo",
					keybind: "ctrl+y",
					onclick: () => DALS.Timeline.redo()
				}
			},
			settings: {
				name: "Settings",
				onclick: () => new UI_Settings()
			},
			tutorial: {
				name: "Tutorial"
			}
		});
	}
};