config.mapmodes.tags = {
	name: "Tags",
	icon: "label",
	description: "Custom viewer for different tags and tag groups.",
	
	symbol_function: (geometry_obj) => {
		let local_tags = (geometry_obj?.metadata?.tags) ? geometry_obj.metadata.tags : [];
		
		if (local_tags.includes("white"))
			return { polygonFill: "#ffffff" };
	}
};