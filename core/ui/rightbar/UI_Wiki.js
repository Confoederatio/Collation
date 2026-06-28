global.UI_Wiki = class extends ve.Class {
	static naissance_folder = "https://confoederatiodocs.info/CRD+(Confoederatio%2C+Research+Division)/Documentation/Software/Naissance/";
	static naissance_url = `${this.naissance_folder}/Naissance`;
	
	constructor () {
		super();
		
		let navbar_el = document.querySelector(".ve.navbar");
		let navbar_height = ((navbar_el) ? navbar_el.offsetHeight : 0);
		
		this.wiki = new ve.Wiki(UI_Wiki.naissance_url, {
			css_file_paths: ["./core/ui/rightbar/ui_wiki.css"]
		});
	}
	
	close () { super.close("instance"); }
	
	getDimensions () {
		//Declare local instance variables
		let navbar_el = document.querySelector(".ve.navbar");
		let navbar_height = Math.returnSafeNumber(navbar_el?.offsetHeight, 0);
		let ui_brush_el = main.brush?.instance_window?.element;
		let ui_date_el = main.interfaces?.date_ui?.instance_window.element;
		let ui_mapmodes_el = main.interfaces?.mapmodes_ui?.instance_window.element;
		
		//Return statement
		return {
			height: window.innerHeight - (navbar_height + 8 + ui_date_el.offsetHeight + 8 + ui_brush_el.offsetHeight + 8 + ui_mapmodes_el.offsetHeight + 8) - 8,
			y: navbar_height + 8 + ui_date_el.offsetHeight + 8
		};
	}
	
	open () {
		//Open window and navigate back to home
		super.open("instance", {
			anchor: "top_right",
			do_not_wrap: true,
			name: "Wiki",
			height: () => this.getDimensions().height,
			width: "26rem",
			x: 8,
			y: () => this.getDimensions().y,
			
			onuserchange: (v, e) => {
				if (v.close) try {
					let help_button_el = main.interfaces.date_ui.time_controls.help.element;
					help_button_el.removeAttribute("naissance-wiki-open");
				} catch (e) {}
			}
		});
		
		if (!this.wiki.v.startsWith(UI_Wiki.naissance_folder))
			setTimeout(() => {
				this.wiki.element.loadURL(UI_Wiki.naissance_url);
			}, 100);
	}
};
