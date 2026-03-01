global.GLOBAL_Liveuamap_Worker = class extends Blacktraffic.Worker {
	static bf = typeof l1m !== "undefined" ? `${l1m}GLOBAL_Liveuamap/` : "./GLOBAL_Liveuamap/";
	static input_auto_regions_json = path.join(this.bf, "Liveuamap_auto_regions.json");
	static _update_regions_interval = 86400 * 7;
	
	constructor(arg0_options) {
		let options = arg0_options || {};
		let target_interval = options.interval || 3600;
		
		super("Liveuamap", {
			...options,
			interval: 0,
			do_not_close_tab: true,
			log_channel: "Liveuamap_Scraper",
		});
		
		this.options.top_regions = Math.returnSafeNumber(options.top_regions, -1);
		this.static = GLOBAL_Liveuamap_Worker;
		this.static.input_chrome_profile = `C:/Users/htmlp/AppData/Local/Google/Chrome/User Data/Profile 1`;
		
		this.options.interval = target_interval;
		if (this.is_enabled && this.options.interval > 0) this.startInterval();
	}
	
	async execute(tab) {
		let all_regions = await this.getLiveuamapRegions();
		let regions_threshold = this.options.top_regions > 0 ? this.options.top_regions : all_regions.length;
		let ontologies = [];
		
		const webapi = Blacktraffic.AgentBrowser.webapi;
		if (!tab._scripts_injected) {
			await tab.evaluateOnNewDocument(webapi.Leaflet.captureMaps);
			tab._scripts_injected = true;
		}
		
		for (let i = 0; i < regions_threshold; i++) {
			try {
				let local_region = all_regions[i];
				if (!local_region) continue;
				
				this.log(`[${i + 1}/${regions_threshold}] Polling region: ${local_region.name} ..`);
				
				await tab.goto(local_region.url, { waitUntil: "networkidle2" });
				await Blacktraffic.sleep(Math.randomNumber(2000, 4000));
				
				let is_paid = await tab.evaluate(() => {
					let modal = document.querySelector(`.modalWrapCont`);
					return modal && modal.innerHTML.includes("in free version");
				});
				
				if (is_paid) {
					this.warn(`Skipping ${local_region.name}: Blocked by free version limit.`);
					continue;
				}
				
				let geometries = await tab.evaluate(function () {
					if (typeof webapi === "undefined" || !webapi.Leaflet) return [];
					if (typeof getMaps !== "function") return [];
					let current_map = getMaps()[0];
					if (!current_map) return [];
					
					let layers = current_map._layers;
					let results = [];
					for (let key in layers) {
						let layer = layers[key];
						let type = webapi.Leaflet.getGeometryType(layer);
						let opt = layer.options;
						
						if (["polygon", "line", "point"].includes(type)) {
							results.push({
								geometry: layer.toGeoJSON(),
								symbol: type === "point" ? {
									markerHeight: 24, markerWidth: 24,
									markerFile: layer._icon ? layer._icon.getAttribute("src") : null
								} : {
									polygonFill: opt.fillColor, polygonOpacity: parseFloat(opt.fillOpacity),
									lineColor: opt.color, lineOpacity: parseFloat(opt.opacity), lineWidth: parseFloat(opt.weight)
								},
								type: type
							});
						}
					}
					return results;
				});
				
				let current_scrape_time = Date.now();
				
				for (let geom of geometries) {
					// Generate a semi-stable ID based on coordinates
					// This ensures that when the scraper runs again, it merges with the previous instance
					let coord_string = JSON.stringify(geom.geometry.geometry.coordinates);
					let event_id = `liveuamap_${local_region.name}_${coord_string.hashCode()}`;
					
					// Create the Ontology_Event instance
					// If event_id exists, the constructor returns the existing instance and calls mergeState()
					let event = new Ontology_Event([{
						date: current_scrape_time,
						data: {
							geometry: geom.geometry,
							symbol: geom.symbol,
							region: local_region.name,
							source: local_region.url
						}
					}], {
						id: event_id,
						worker_type: "Liveuamap"
					});
					
					// Draw the instance immediately
					event.draw();
					ontologies.push(event);
				}
				
				await Blacktraffic.sleep(Math.randomNumber(10000, 15000));
			} catch (e) {
				this.error(`Error processing region ${i}:`, e.message);
			}
		}
		return ontologies;
	}
	
	async getLiveuamapRegions() {
		const json_path = this.constructor.input_auto_regions_json;
		if (fs.existsSync(json_path)) {
			let age = Date.now() - fs.statSync(json_path).mtimeMs;
			if (age < this.constructor._update_regions_interval * 1000) return JSON.parse(fs.readFileSync(json_path, "utf8"));
		}
		this.log("Refreshing regions cache...");
		let browser = await this.getBrowser();
		let temp_tab = await browser.openTab("liveuamap_discovery");
		try {
			await temp_tab.goto("https://liveuamap.com/", { waitUntil: "networkidle2" });
			await temp_tab.waitForSelector(`a#menu_languages`);
			await temp_tab.click(`a#menu_languages`);
			let regions = await temp_tab.$$eval(`div.rg-list > a`, els => els.map(el => ({ name: el.getAttribute("title"), url: el.href })));
			if (!fs.existsSync(path.dirname(json_path))) fs.mkdirSync(path.dirname(json_path), { recursive: true });
			fs.writeFileSync(json_path, JSON.stringify(regions, null, 2));
			await temp_tab.close();
			return regions;
		} catch (e) {
			this.error("Discovery failed:", e.stack);
			await temp_tab.close();
			return fs.existsSync(json_path) ? JSON.parse(fs.readFileSync(json_path, "utf8")) : [];
		}
	}
};

/**
 * String Hashing Helper
 */
if (!String.prototype.hashCode) {
	String.prototype.hashCode = function() {
		let hash = 0;
		for (let i = 0, len = this.length; i < len; i++) {
			let chr = this.charCodeAt(i);
			hash = (hash << 5) - hash + chr;
			hash |= 0;
		}
		return Math.abs(hash).toString(16);
	};
}