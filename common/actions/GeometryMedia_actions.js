config.actions.geometry_media = {
	create_media: {
		name: "Create Media",
		scope: ["GeometryMedia"],
		
		special_function: async function (json)  {
			if (json.create_media.id) {
				let new_media = new naissance.GeometryMedia();
				new_media.setID(json.create_media.id);
				
				//Refresh leftbar on creation
				UI_Leftbar.refresh();
			}
		}
	}
};