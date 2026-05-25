global.UI_SystemManagerWindow = class {
	static histmap_table;
	static instance;
	
	constructor () {
		//Declare local instance variables
		this.static = UI_SystemManagerWindow;
		
		if (!this.static.histmap_table)
			this.static.histmap_table = new ve.Table({});
		
		if (this.static.instance) this.static.instance.close();
		this.static.instance = vePageMenuWindow({
			histmap_workers: {
				name: "Histmap Workers",
				components_obj: {
					histmap_table: this.static.histmap_table
				}
			},
			livemap_workers: {
				name: "Livemap Workers"
			},
			script_manager: {
				name: "Script Manager (IDE)",
				components_obj: {
					script_manager: veScriptManager()
				}
			}
		}, {
			can_rename: false,
			name: "System Manager",
			height: "80dvh",
			width: "80dvw",
			
			page_menu_options: { starting_page: "script_manager" }
		});
		
		if (!this.static.logic_loop)
			this.static.logic_loop = setInterval(async () => {
				let histmap_table = this.static.histmap_table;
				
				histmap_table.v = await this.static.getHistmapWorkersTableArray();
			}, 100);
	}
	
	static async getHistmapWorkersTableArray () {
		//Declare local instance variables
		let ipcRenderer = electron.ipcRenderer;
		
		return new Promise((resolve, reject) => {
			ipcRenderer.removeAllListeners("ndjson:get_diagnostics_ready");
			
			ipcRenderer.on("ndjson:get_diagnostics_ready", (event, all_workers) => {
				let table_array = [["Thread ID", "Heap", "RAM/RSS", "Utilisation (Processing)"]];
				
				for (let i = 0; i < all_workers.length; i++) {
					let heap_used_mb = all_workers[i].heapUsed/(1024*1024);
					let heap_total_mb = all_workers[i].heapTotal/(1024*1024);
					let rss_mb = all_workers[i].rss/(1024*1024);
					
					table_array.push([
						all_workers[i].worker_id,
						`${String.formatNumber(heap_used_mb)}/${String.formatNumber(heap_total_mb)}MB (${Math.round((heap_used_mb/heap_total_mb)*100)}%)`,
						`${String.formatNumber(rss_mb)}MB`,
						`${Math.round(all_workers[i].percentage)}%`,
					]);
				}
				
				resolve(table_array);
			});
			ipcRenderer.send("ndjson:get_diagnostics");
		});
	}
};