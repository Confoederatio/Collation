global.UI_LeftbarTimeline = class {
	static instances = [];
	static refresh_frame = false;
	
	constructor () {
		//Declare local instance variables
		this.ui = {};
		this.value = new ve.Timeline(undefined, {
			onkeyframerightclick: (v, e) => {
				//Declare local instance variables
				let keyframe_obj = v[1].keyframe;
				let timestamp = Date.getTimestamp(keyframe_obj.key);
				
				if (this.keyframe_window) this.keyframe_window.close();
				this.keyframe_window = veWindow({
					move_keyframe_to: veButton(() => {
						if (this.move_keyframe_to_window) this.move_keyframe_to_window.close();
						this.move_keyframe_to_window = veWindow({
							end_date: veDate((this.ui.move_keyframe_to_date !== undefined) ? this.ui.move_keyframe_to_date : timestamp, {
								onuserchange: (v) => this.ui.move_keyframe_to_date = v
							}),
							confirm: veButton(() => {
								//Internal guard clause for this.ui.move_keyframe_to_date
								if (this.ui.move_keyframe_to_date === undefined) {
									veToast("The date to move the keyframe to cannot be the same as the initial date.");
									return;
								}
								
								//Declare local instance variables
								let to_timestamp = Date.getTimestamp(this.ui.move_keyframe_to_date);
								
								//Move global keyframe
								DALS.Timeline.parseAction("move_global_keyframe", [{
									type: "Renderer",
									move_keyframe: {
										from_timestamp: timestamp,
										to_timestamp: to_timestamp
									}
								}]);
								UI_Leftbar.refresh();
								
								let date_string = String.formatDate(Date.convertTimestampToDate(timestamp));
								let ot_date_string = String.formatDate(Date.convertTimestampToDate(to_timestamp));
								
								veToast(`Moved global keyframe from ${date_string} to ${ot_date_string}.`);
								
								if (this.move_keyframe_to_window) this.move_keyframe_to_window.close();
								if (this.keyframe_window) this.keyframe_window.close();
							}, { name: "Confirm" })
						}, {
							name: "Move Keyframe To",
							can_rename: false,
							width: "15rem"
						})
					}, { name: "Move Keyframe To" }),
					jump_to_date: veButton(() => {
						DALS.Timeline.parseAction("load_date", [
							{ set_date: Date.convertTimestampToDate(timestamp) },
							{ refresh_date: true }
						]);
					}, { name: "Jump to Date" })
				}, {
					name: v[0],
					can_rename: false,
					width: "15rem"
				});
			}
		});
		
		this.refresh();
		
		UI_LeftbarTimeline.instances.push(this);
	}
	
	refresh () {
		if (!(global.main || window.main)) return; //Internal guard clause if main is not defined
		
		//Declare local instance variables
		let all_timestamps = main.renderer.getTimestamps();
		let keyframes_obj = {};
		
		//Iterate over all_timestamps and push to keyframes_obj
		for (let i = 0; i < all_timestamps.length; i++)
			keyframes_obj[all_timestamps[i]] = {
				name: "Global keyframe"
			};
		
		this.value.setKeyframes(keyframes_obj);
	}
	
	static refresh () {
		if (UI_LeftbarTimeline.do_not_refresh) return;
		this.refresh_frame = true;
		
		if (!this.logic_loop) this.logic_loop = setInterval(() => {
			if (this.refresh_frame) {
				for (let i = 0; i < this.instances.length; i++)
					this.instances[i].refresh();
				delete this.refresh_frame;
			}
		}, 100);
	}
};