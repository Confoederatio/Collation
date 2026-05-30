global.UI_Leftbar = class extends ve.Class {
	constructor () {
		super();
		
		this.page_menu = new ve.PageMenu({
			file_explorer: {
				name: "File",
				components_obj: {
					file_explorer: veFileExplorer(path.join(process.cwd(), "saves"), {
						name: " ",
						navigation_only: true
					})
				}
			},
			hierarchy: {
				name: "Hierarchy",
				components_obj: {
					
				}
			},
			undo_redo: {
				name: "Undo/Redo",
				components_obj: { undo_redo: veUndoRedo() }
			}
		}, {
			do_not_wrap: true,
			starting_page: "hierarchy"
		});
		
		super.open("instance", {
			anchor: "top_left",
			do_not_wrap: true,
			mode: "static_ui",
			height: `calc(100dvh - 16px)`,
			width: "24rem",
			x: 8,
			y: 8
		});
	}
};