if (!global.naissance) global.naissance = {};
naissance.Entity = class extends ve.Class {
	static instances = new Map();
	
	constructor (arg0_options, arg1_value) {
		super();
		this._init(arg0_options, arg1_value).then(() => {});
	}
	async _init (arg0_options, arg1_value) {
		//Convert from parameters
		this.options = (arg0_options) ? arg0_options : {};
		this.value = arg1_value;
		
		//Initialise options
		if (!this.options.hierarchy_icon) this.options.hierarchy_icon = "select";
		
		//Declare local instance variables
		this.class_name = "Entity";
	}
	
	async drawHierarchyDatatype () {
		//Declare local instance variables
		if (this.hierarchy_datatype?.remove) this.hierarchy_datatype.remove();
		this.hierarchy_datatype = new ve.HierarchyDatatype({
			icon: veHTML(`<icon>${this.options.hierarchy_icon}</icon>`, { tooltip: this.class_name }),
			context_menu: veButton(() => {
				super.open("instance", { name: this.getName(), ...this.window_options })
			}, {
				attributes: { class: "order-101" },
				name: "<icon>more_vert</icon>"
			})
		}, {
			do_not_display: true,
			instance: this,
			name: this.getName()
		});
		
		//Return statement
		return this.hierarchy_datatype;
	}
	
	getName () { return "Entity"; }
};