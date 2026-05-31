if (!global.naissance) global.naissance = {};
naissance.Geometry = class extends naissance.Entity {
	constructor (arg0_id, arg1_value) {
		super(arg0_id, arg1_value);
		this.class_name = "Geometry";
	}
	
	canDerender (arg0_value) {
		//Convert from parameters
		let value = (arg0_value) ? arg0_value : this.value;
		
		if (value[2]) {
			if (value[2].max_zoom && map.getZoom() > value[2].max_zoom) return true;
			if (value[2].min_zoom && map.getZoom() < value[2].min_zoom) return true;
		}
	}
	
	canRemove (arg0_value) {
		//Convert from parameters
		let value = (arg0_value) ? arg0_value : this.value;
		
		if (value) {
			if (value.length === 0) return true; //If no value, just remove it
			if (value[0] === null) return true;
			if (value[2])
				if (value[2].hidden) return true;
		}
	}
	
	async getGeometryInterface (arg0_value) {
		//Convert from parameters
		let value = (arg0_value) ? arg0_value : this.value;
		
		//Declare local instance variables
		let keyframes_obj = await db.getKeyframes(this.id);
			keyframes_obj = keyframes_obj.value;
		console.log(keyframes_obj)
		
		//Iterate over all_keyframes and move them to components_obj
		let all_keyframes = History.getTimestamps(keyframes_obj).reverse();
		//console.log(History.getTimestamps(keyframes_obj.))
		let components_obj = {};
		
		for (let i = 0; i < all_keyframes.length; i++) {
			let local_keyframe = keyframes_obj[all_keyframes[i]];
			
			components_obj[i] = veInterface({
				date_info: veHTML(String.formatDate(parseInt(all_keyframes[i])), {
					tooltip: `Timestamp: ${all_keyframes[i]}`,
					x: 0, y: 0
				}),
				localisation: veHTML(local_keyframe.localisation.join("<br>"), { x: 1, y: 0 }),
				actions_bar: veRawInterface({
					jump_to_date: veButton(async (e) => {
						await naissance.Renderer.setDate(all_keyframes[i])
					}, {
						name: "<icon>arrow_forward</icon>",
						tooltip: "Jump to Date"
					}),
					move_keyframe: veButton(async () => {
						
					}, {
						name: "<icon>height</icon>",
						tooltip: "Move Keyframe"
					}),
					remove_keyframe: veButton(async () => {
						
					}, {
						name: "<icon>delete</icon>",
						tooltip: "Delete Keyframe"
					})
				}, {
					attributes: {
						class: "actions-bar"
					},
					x: 2, y: 0
				})
			}, {
				attributes: { class: "kf-row" },
				gc: true,
				is_folder: false,
				style: {
					
				}
			});
		}
		
		let interface_obj = veInterface(components_obj, {
			name: `Keyframes (${String.formatNumber(all_keyframes.length)}):`,
			open: true,
			style: {
				".actions-bar": {
					display: "flex",
					flexWrap: "nowrap",
					"[component='ve-button']": { marginRight: "var(--padding)" }
				},
				".kf-row > table > tbody > tr": {
					"[id='0-0']": { width: "6rem" },
					"[id='1-0']": { width: "50%" },
				},
			},
			width: 99
		});
		
		//Return statement
		return interface_obj;
	}
	
	getName () {
		//Return statement
		return (this.value?.[2]?.name) ? this.value[2].name : `New ${this.class_name}`;
	}
	
	remove () {
		this.removeGeometries();
		delete naissance.Entity.instances[this.id];
	}
	
	removeGeometries () {
		if (this.geometry) this.geometry.remove();
		this.geometry = undefined;
	}
};