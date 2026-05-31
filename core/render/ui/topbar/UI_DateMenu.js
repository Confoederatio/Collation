global.UI_DateMenu = class extends ve.Class {
	static logic_loop = null;
	
	constructor () {
		super();
		
		//Declare local instance variables
		let navbar_el = document.querySelector(".ve.navbar");
		this.date = veDate(undefined, {
			name: " ",
			tooltip: "BC years are negative.",
			onuserchange: (v) => {
				if (this.is_playing) return;
				naissance.Renderer.setDate(v);
			}
		});
		
		//Open date menu
		super.open("instance", {
			anchor: "top_right",
			attributes: {
				"data-do-not-toggle-ui": "true"
			},
			mode: "static_window",
			name: "Date",
			width: "24rem",
			x: 8,
			y: ((navbar_el) ? navbar_el.offsetHeight : 0) + 8
		})
	}
};