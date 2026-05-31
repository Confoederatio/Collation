if (!global.naissance) global.naissance = {};
naissance.FeatureGroup = class extends naissance.Feature {
	constructor (arg0_id, arg1_value) {
		super(arg0_id, arg1_value);
		this.class_name = "FeatureGroup";
	}
};