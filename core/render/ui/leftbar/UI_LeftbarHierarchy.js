global.UI_LeftbarHierarchy = class extends ve.Class {
	constructor () {
		super();
	}
	
	async draw () {
		//Declare local instance variables
		let all_hierarchy_values = await db.getHierarchyValues(main.timestamp);
	}
};