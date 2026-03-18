global.UI_Mapmodes_Settings = class extends ve.Class {
	constructor () {
		super();
		
		this.interface = new ve.Interface({
			disable_mapmode_interactivity: new ve.Toggle(main.settings.disable_mapmode_interactivity, {
				name: "Disable Mapmode Interactivity",
				tooltip: "Disables click events for overlay/underlay mapmodes.",
				
				onuserchange: (v) => {
					main.settings.disable_mapmode_interactivity = v;
					this.update();
				}
			})
		}, {
			is_folder: false
		});
	}
	
	update () {
		if (main.settings.disable_mapmode_interactivity) {
			main.layers.mapmode_top_layer.setOptions({ hitDetect: false, interactive: false });
			main.layers.mapmode_bottom_layer.setOptions({ hitDetect: false, interactive: false });
		} else {
			main.layers.mapmode_top_layer.setOptions({ hitDetect: true, interactive: true });
			main.layers.mapmode_bottom_layer.setOptions({ hitDetect: true, interactive: true });
		}
	}
};