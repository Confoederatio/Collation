if (!global.naissance) global.naissance = {};
naissance.Entity = class extends ve.Class {
	static instances = {};
	
	constructor (arg0_id, arg1_value) {
		//Convert from parameters
		let id = arg0_id;
		let value = arg1_value;
		super();
		
		//Declare local instance variables
		this.class_name = "Entity";
		this.id = id;
		this.value = value;
		
		//Push to naissance.Entity.instances
		naissance.Entity.instances[this.id] = this;
	}
	
	async drawHierarchyDatatype () {
		//Declare local instance variables
		if (this.hierarchy_datatype?.remove) this.hierarchy_datatype.remove();
		this.hierarchy_datatype = new ve.HierarchyDatatype({
			icon: veHTML(`<icon>select</icon>`, { tooltip: this.class_name }),
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