config.actions.geometry_image = {
	create_image: {
		name: "Create Image",
		scope: ["GeometryImage"],
		
		special_function: async function (json)  {
			if (json.create_image.id) {
				let new_image = new naissance.GeometryImage();
				new_image.setID(json.create_image.id);
				
				//Refresh leftbar on creation
				UI_Leftbar.refresh();
			}
		}
	}
};