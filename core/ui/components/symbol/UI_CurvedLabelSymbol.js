global.UI_CurvedLabelSymbol = class extends ve.Component {
	constructor (arg0_value, arg1_options) {
		//Convert from parameters
		let value = arg0_value;
		let options = (arg1_options) ? arg1_options : {};
			super(options);
			
		//Declare local instance variables
		this.options = options;
		this.value = (value || {});
		
		this.list_component = veList(veRawInterface({ 
			css_key: veText("", { name: "Key" }), 
			css_value: veText("", { name: "Value" }) 
		}), {
			name: "CSS Style",
			onuserchange: () => this.fireToBinding()
		});
		this.element = this.list_component.element;
		
		HTML.applyTelestyle(this.element, {
			"[component='ve-text']": { display: "inline" }
		});
	}
	
	get v () { return this.value; }
	
	set v (arg0_value) {
		//Convert from parameters
		let value = (arg0_value) ? arg0_value : {};
		
		//Declare local instance variables
		let css_list = [];
		
		//Iterate over all keys in value
		Object.iterate(value, (local_key, local_value) => {
			css_list.push(veRawInterface({
				css_key: veText(local_key, { name: "Key" }),
				css_value: veText(local_value, { name: "Value" })
			}));
		});
		
		this.list_component.v = css_list;
	}
	
	draw () {
		return veInterface({
			list_component: this.list_component
		}, { name: (this.options.name || "Curved Label Symbol") });
	}
};