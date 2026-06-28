/**
 * /**
 *  * Refer to <span color = "yellow">{@link ve.Component}</span> for methods or fields inherited from this Component's parent such as `.options.attributes` or `.element`.
 *  
 * ##### Constructor:
 * - `arg0_value` :{@link string} - The URL string of the wiki to target.
 * - `arg1_options`: {@link Object}
 *   - `.css_file_path`: {@link string} - The file path to inject as CSS for the target page.
 * 
 * @augments ve.Component
 * @memberof ve.Component
 * @type {ve.Wiki}
 */
ve.Wiki = class extends ve.Component {
	constructor (arg0_value, arg1_options) {
		//Convert from parameters
		let value = arg0_value;
		let options = (arg1_options) ? arg1_options : {};
			super(options);
			
		//Initialise options
		options.attributes = (options.attributes) ? options.attributes : {};
		
		//Declare local instance variables
		this.element = document.createElement("webview");
			this.element.setAttribute("component", "ve-wiki");
			this.element.setAttribute("preload", "./UF/js/vercengen/components/ComponentWiki/wiki_preload.js");
			this.element.instance = this;
			
		this.options = options;
		this.value = value;
		
		//Set .v
		this.v = this.value;
	}
	
	get v () {
		//Return statement
		return this.element.src;
	}
	
	set v (arg0_value) {
		//Convert from parameters
		let value = (arg0_value) ? arg0_value : "about:blank";
		
		//Load URL and fireFromBinding
		this.value = value;
		this.element.src = this.value;
		
		this.fireFromBinding();
	}
};