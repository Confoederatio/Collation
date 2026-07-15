if (!global.naissance) global.naissance = {};

naissance.GeometryImage = class extends naissance.Geometry {
	constructor () {
		super();
		this.class_name = "GeometryImage";
		
		//Add keyframe with default image upon instantiation
		let brush_symbol = main.brush.getBrushSymbol();
		if (brush_symbol)
			this.addKeyframe(main.date, undefined, brush_symbol);
		
		//KEEP AT BOTTOM!
		this.updateOwner();
		
		console.warn(`naissance.GeometryImage is still a WIP.`);
	}
};