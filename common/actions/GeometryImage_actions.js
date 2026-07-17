config.actions.geometry_media = {
	create_media: {
		name: "Create Media",
		scope: ["GeometryMedia"],
		
		special_function: async function (json)  {
			if (json.create_image.id) {
				let new_image = new naissance.GeometryMedia();
				new_image.setID(json.create_image.id);
				
				//Refresh leftbar on creation
				UI_Leftbar.refresh();
			}
		}
	}
};