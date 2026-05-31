if (!global.naissance) global.naissance = {};
naissance.Feature = class extends naissance.Entity {
	constructor (arg0_id, arg1_value) {
		super(arg0_id, arg1_value);
		this.class_name = "Feature";
		
		//Destructure value
		Object.iterate(this.value, (local_key, local_value) => {
			this[local_key] = local_value;
		});
		delete this.value;
	}
};