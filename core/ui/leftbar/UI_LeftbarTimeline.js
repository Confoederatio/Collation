global.UI_LeftbarTimeline = class {
	static instances = [];
	static refresh_frame = false;
	
	constructor () {
		//Declare local instance variables
		this.value = new ve.Timeline(undefined, {});
		
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