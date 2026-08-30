global.gini_OLS = class {
	static bf = `${h2}/gini_OLS/`;
	static input_gini_premodern_csv = `${h1}/gini_Eoscala/`;
	static intermediate_ols_eoscala = `${this.bf}OLS_Eoscala/`;
	static intermediate_ols_gapminder = `${this.bf}OLS_Gapminder/`;
	static intermediate_ols_subngini = `${this.bf}OLS_SubNGini/`;
	
	static options = {
		eoscala_domain: [-21500, 2006],
		gapminder_domain: [1800, 1990],
		subngini_domain: [1990, 2023]
	};
	
	static async getEoscalaGiniObject () {
		
	}
	
	static async getGapminderGiniObject () {
		
	}
	
	static async getSubNGiniObject () {
		
	}
	
	//[WIP] - Refactor this so it depends on Geospatiale.getEquirectangularNearestPixelWith
	static getNearestLandPixel (arg0_lng, arg1_lat) {
		//Convert from parameters
		let lng = parseFloat(arg0_lng);
		let lat = parseFloat(arg1_lat);
		
		//Declare local instance variables
		if (!this.landarea_raster) this.landarea_raster = GeoPNG.loadNumberRasterImage(
			metadata_HYDE.input_raster_land_area, { format: "int32" });
		
		//Fetch equirectangular pixel; if it is in landarea_raster, return it; otherwise fetch nearest landarea
		let pixel_coords = Geospatiale.getEquirectangularCoordsPixel(lat, lng, {
			height: this.landarea_raster.height,
			width: this.landarea_raster.width
		});
		let pixel_index = pixel_coords[1]*this.landarea_raster.width + pixel_coords[0];
		
		//Return statement
		if (this.landarea_raster.data[pixel_index] > 0)
			return pixel_coords;
		
		//Declare search parameters
		let width = this.landarea_raster.width;
		let height = this.landarea_raster.height;
		let start_x = pixel_coords[0];
		let start_y = pixel_coords[1];
		
		let max_radius = Math.max(width, height);
		
		//Expand outward in concentric rings to find the nearest land pixel
		for (let r = 1; r < max_radius; r++) {
			let candidates = [];
			
			let check_pixel = (cx, cy) => {
				if (cy < 0 || cy >= height) return;
				let wrapped_x = (cx % width + width) % width;
				let idx = cy*width + wrapped_x;
				if (this.landarea_raster.data[idx] > 0) {
					candidates.push([wrapped_x, cy]);
				}
			};
			
			//Top and bottom rows of the current ring
			for (let dx = -r; dx <= r; dx++) {
				check_pixel(start_x + dx, start_y - r);
				check_pixel(start_x + dx, start_y + r);
			}
			//Left and right columns of the current ring
			for (let dy = -r + 1; dy <= r - 1; dy++) {
				check_pixel(start_x - r, start_y + dy);
				check_pixel(start_x + r, start_y + dy);
			}
			
			//If land pixels are found within this ring, calculate the absolute closest via haversine distance
			if (candidates.length > 0) {
				let min_dist = Infinity;
				let best_pixel = null;
				
				for (let i = 0; i < candidates.length; i++) {
					let [cx, cy] = candidates[i];
					let c_lng = ((cx + 0.5)/width)*360 - 180;
					let c_lat = 90 - ((cy + 0.5)/height)*180;
					let dist = Geospatiale.haversineDistance([lng, lat], [c_lng, c_lat]);
					
					if (dist < min_dist) {
						min_dist = dist;
						best_pixel = [cx, cy];
					}
				}
				if (best_pixel) return best_pixel;
			}
		}
	}
};