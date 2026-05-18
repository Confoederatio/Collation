global.polities_Cliopatria = class {
	static input_path_anaconda_activate = "C:/Users/htmlp/anaconda3/Scripts/activate.bat";
	static input_path_conda_home = "C:/Users/htmlp/anaconda3";
	static input_path_geojson = `${h1}/polities_Cliopatria/cliopatria.geojson/cliopatria_polities_only.geojson`;
	static input_rasters_robinson = `${h1}polities_Cliopatria/original_map_images/`;
	static intermediate_rasters_colourmaps = `${h2}polities_Cliopatria/rasters_colourmap/`;
	static intermediate_rasters_equirectangular = `${h2}polities_Cliopatria/rasters_equirectangular/`;
	static output_path_geojson = `${h2}/polities_Cliopatria/polities.geojson`;
	
	static A_getAllRobinsonRasters () {
		//Declare local instance variables
		let all_files = File.getAllFilesSync(this.input_rasters_robinson);
		
		//Iterate over all_files in reverse and remove anything that does not start with a capital B/C and end in .PNG
		for (let i = all_files.length - 1; i >= 0; i--) {
			if (path.extname(all_files[i]) !== ".PNG") { //Internal guard clause if it doesn't end in .PNG
				all_files.splice(i, 1);
				continue;
			}
			
			let local_file = path.basename(all_files[i]); //B/C handler
			if (!(local_file.startsWith("B") || local_file.startsWith("C")))
				all_files.splice(i, 1);
		}
		
		//Return statement
		return all_files;
	}
	
	static async A_normaliseRobinson (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Initialise options
		options.concurrency_limit = Math.returnSafeNumber(options.concurrency_limit, 16);
		
		//Declare local instance variables
		let all_rasters = this.A_getAllRobinsonRasters();
		let expanded_rasters = [];
		
		//Iterate over all_rasters and chunk them
		for (let i = 0; i < all_rasters.length; i += options.concurrency_limit) {
			let chunk = all_rasters.slice(i, i + options.concurrency_limit);
			
			let chunk_promises = chunk.map(async (local_raster) => {
				let output_raster = `${local_raster.replace(".PNG", "")}_expanded.png`;
				
				try {
					await exec(`magick "${local_raster}" -background none -splice 160x0 "${output_raster}"`);
					expanded_rasters.push(output_raster);
					
					console.log(`Finished expanding ${local_raster} to Standard Robinson.`);
				} catch (e) {
					console.error(e);
				}
			});
			await Promise.all(chunk_promises);
		}
		
		//Return statement
		return expanded_rasters;
	}
	
	static async B_convertRobinsonToEquirectangular (arg0_options) { //[QUARANTINE]
		let options = arg0_options || {};
		let all_rasters = polities_Cliopatria.B_getAllNormalisedRobinsonRasters();
		let all_output_rasters = [];
		
		// Point directly to the source to bypass your /K wrapper
		const tempBatDir = path.resolve(process.cwd(), 'temp_jobs');
		
		if (!fs.existsSync(tempBatDir))
			fs.mkdirSync(tempBatDir, { recursive: true });
		
		//Iterate over all_rasters
		for (let i = 0; i < all_rasters.length; i++) {
			const local_raster = path.resolve(all_rasters[i]);
			
			let prefix = path.basename(all_rasters[i]).startsWith('B') ? '-' : '';
			let base_name = all_rasters[i].replace('_expanded', '').split('-')[1] || i;
			let output_name = `${prefix}${base_name}`;
			let output_raster = path.resolve(polities_Cliopatria.input_path_equirectangular, output_name);
			
			let t1 = path.resolve(process.cwd(), `${output_name.replace('.png', '')}_t1.tif`);
			let t2 = path.resolve(process.cwd(), `${output_name}_t2.tif`);
			
			//GDAL chain
			let gdal_chain = [
				`gdal_translate -a_srs "ESRI:54030" -a_ullr -17035872.77 8542325 17035872.77 -7944003 "${local_raster}" "${t1}"`,
				`gdalwarp -t_srs "EPSG:4326" -te -180 -90 180 90 -tr 0.083333333333333 0.083333333333333 -r near -wo SOURCE_EXTRA=1000 -wo SAMPLE_STEPS=1000 "${t1}" "${t2}"`,
				`gdal_translate -of PNG "${t2}" "${output_raster}"`,
				`del "${t1}" "${t2}"`,
			].join(' && ');
			
			// The Batch File: We use the single-line cmd /C logic you confirmed works
			const batContent = [
				`@echo off`,
				`cmd /C "call "${this.input_path_anaconda_activate}" "${this.input_path_conda_home}" && ${gdal_chain}"`,
			].join('\r\n');
			
			const batFilePath = path.join(tempBatDir, `job_${i}.bat`);
			fs.writeFileSync(batFilePath, batContent, 'utf8');
			
			console.log(`\n> EXECUTING [${i + 1}/${all_rasters.length}]: ${output_name}`);
			
			// --- MUTEX LOCK BEGIN ---
			// spawnSync blocks the entire Node.js thread until the process is GONE.
			const result = child_process.spawnSync('cmd.exe', ['/c', `"${batFilePath}"`], {
				shell: true,
				stdio: 'inherit',
			});
			
			if (result.status === 0) {
				all_output_rasters.push(output_raster);
				if (fs.existsSync(batFilePath)) fs.unlinkSync(batFilePath);
			} else {
				console.error(`\n[!] Job ${i} failed with status ${result.status}`);
			}
			
			//MUTEX LOCK: Wait 1,5 seconds for Anaconda to resolve
			await new Promise((resolve) => setTimeout(resolve, 1500));
		}
		
		console.log(`\n- Sequence finished. Total processed: ${all_output_rasters.length}`);
		return all_output_rasters;
	}
	
	static B_getAllNormalisedRobinsonRasters () {
		//Declare local instance variables
		let all_files = File.getAllFilesSync(this.input_rasters_robinson);
		
		//Iterate over all_files in reverse and remove anything that does not end with _expanded.png
		for (let i = all_files.length - 1; i >= 0; i--)
			if (!all_files[i].endsWith("_expanded.png"))
				all_files.splice(i, 1);
		
		//Return statement
		return all_files;
	}
	
	static async C_deleteAuxXMLFiles () {
		//Declare local instance variables
		let all_files = File.getAllFilesSync(this.intermediate_rasters_equirectangular);
		let delete_file_paths = [];
		
		//Iterate over all_files and detect .png.aux.xml extensions
		for (let i = 0; i < all_files.length; i++)
			if (path.basename(all_files[i]).endsWith(".png.aux.xml"))
				delete_file_paths.push(all_files[i]);
		
		let results = await Promise.allSettled(
			delete_file_paths.map((local_path) => node_fs_promises.unlink(local_path)));
		results.forEach((local_result, local_index) => {
			if (local_result.status === "rejected")
				if (local_result.reason.code !== "ENOENT")
					console.error(`Failed to delete ${delete_file_paths[local_index]}:`, local_result.reason.message);
		});
	}
	
	static async D_normaliseEquirectangular (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Initialise options
		options.concurrency_limit = Math.returnSafeNumber(options.concurrency_limit, 16);
		
		//Declare local instance variables
		let all_files = File.getAllFilesSync(this.intermediate_rasters_equirectangular);
		let equirectangular_rasters = [];
		
		//Iterate over all_files and append them to equirectangular_rasters if valid
		for (let i = 0; i < all_files.length; i++) {
			let local_basename = path.basename(all_files[i]);
			
			if (local_basename.endsWith(".png") && !isNaN(parseInt(local_basename.replace(".png", ""))))
				equirectangular_rasters.push(all_files[i]);
		}
		
		//Iterate over equirectangular_rasters and chunk them
		for (let i = 0; i < equirectangular_rasters.length; i += options.concurrency_limit) {
			let chunk = equirectangular_rasters.slice(i, i + options.concurrency_limit);
			
			let chunk_promises = chunk.map(async (local_raster) => {
				try {
					await exec(`magick "${local_raster}" -roll +126+0 "${local_raster}"`);
					console.log(`Finished normalising ${local_raster} to Equirectangular.`);
				} catch (e) {
					console.error(e);
				}
			});
			await Promise.all(chunk_promises);
		}
	}
	
	static E_getAllRasterYears () {
		//Declare local instance variables
		let all_files = File.getAllFilesSync(this.intermediate_rasters_equirectangular);
		let equirectangular_years = [];
		
		//Iterate over all_files and append them to equirectangular_rasters if valid
		for (let i = 0; i < all_files.length; i++) {
			let local_basename = path.basename(all_files[i]);
			let local_year = parseInt(local_basename.replace(".png", ""));
			
			if (local_basename.endsWith(".png") && !isNaN(local_year))
				equirectangular_years.push(local_year);
		}
		
		equirectangular_years.sort((a, b) => a - b); //Sort in ascending order
		
		//Return statement
		return equirectangular_years;
	}
	
	static async E_generateColourmaps () {
		//Declare local instance variables
		let equirectangular_years = this.E_getAllRasterYears();
		
		for (let i = 0; i < equirectangular_years.length; i++) {
			await this.Experimental_renderYear(equirectangular_years[i]);
			console.log(`Processed colourmap for ${equirectangular_years[i]}.`);
		}
	}
	
	static async F_assignColours () {
		//Declare local instance variables
		let colourmap_years = this.E_getAllRasterYears();
		let geojson_obj = JSON.parse(fs.readFileSync(polities_Cliopatria_UI.input_path, "utf8"));
		
		//Iterate over geojson_obj.features and assign POIs
		for (let i = 0; i < geojson_obj.features.length; i++) {
			let local_feature = geojson_obj.features[i];
			
			if (!local_feature.properties) geojson_obj.features[i].properties = {};
			local_feature.properties.poi = Geospatiale.getPoleOfInaccessibility(geojson_obj.features[i]);
			let local_marker = new maptalks.Marker([
				local_feature.properties.poi[1],
				local_feature.properties.poi[0]
			]).addTo(main.layers.entity_layer);
				local_marker.addEventListener("click", (e) => {
					console.log(local_feature.properties);
				});
		}
		console.log(geojson_obj.features);
		
		//Iterate over geojson_obj.features and assign .fill_colour
		for (let i = 0; i < geojson_obj.features.length; i++) {
			if (!geojson_obj.features[i].properties) geojson_obj.features[i].properties = {};
			let local_properties = geojson_obj.features[i].properties;
			
			let local_midpoint = Array.getMidpoint([local_properties.FromYear, local_properties.ToYear]);
			let local_poi_coord = Geospatiale.getEquirectangularCoordsPixel(local_properties.poi[0], local_properties.poi[1]);
			let local_selected_year = Array.getClosest(colourmap_years, local_midpoint);
			
			let local_selected_colourmap = `${this.intermediate_rasters_colourmaps}${local_selected_year}.png`;
			
			try {
				let local_colourmap_obj = GeoPNG.loadImage(local_selected_colourmap);
				let local_rgba = GeoPNG.getRGBAFromPixel(local_colourmap_obj, local_poi_coord[1]*4320 + local_poi_coord[0]);
				
				//Set local_rgba
				local_properties.fill_colour = local_rgba;
				
				console.log(`Selected File:`, local_selected_colourmap, `Local POI Coord:`, local_poi_coord, `RGBA:`, local_rgba);
			} catch (e) { 
				console.error(`Selected File:`, local_selected_colourmap, e);
			}
		}
		
		//Write to geojson
		fs.writeFileSync(polities_Cliopatria_UI.output_path_geojson, JSON.stringify(geojson_obj), "utf8");
		console.log(`Written to GeoJSON.`);
	}
	
	static async processRasters () {
		//1. Normalise base rasters' Robinson projection
		await this.A_normaliseRobinson();
		//2. Convert Robinson > Equirectangular using Anaconda/GDAL
		await this.B_convertRobinsonToEquirectangular();
		//3. Delete excess files
		await this.C_deleteAuxXMLFiles();
		//4. Normalise Equirectangular
		await this.D_normaliseEquirectangular();
		//5. Process colourmaps
		await this.E_generateColourmaps();
		//6. Assign colours
		await this.F_assignColours();
	}
	
	//Experimental methods
	static async Experimental_renderYear (arg0_year, arg1_options) {
		//Convert from parameters
		let year = parseInt(arg0_year);
		let options = (arg1_options) ? arg1_options : {};
		
		//Set date; then process year
		UI_DateMenu.setDate({
			year: year,
			month: 1,
			day: 1,
			hour: 0,
			minute: 0
		});
		await GeoPNG.kNNBin(`${h2}polities_Cliopatria/rasters_equirectangular/${year}.png`, `${h2}polities_Cliopatria/rasters_colourmap/${year}.png`, {
			bin_colours: [[5, 7, 8, 255], [2, 4, 1, 255], [0, 0, 255, 255], /*[255, 0, 0, 255],*/ [2, 5, 4, 255], [5, 7, 2, 255], [2, 4, 6, 255]],
			ignore_colours: [[182, 220, 244, 255],  [217, 237, 249, 255], [0, 0, 0, 255]]
		});
		await GeoPNG.convertToGeoJSON(`${h2}polities_Cliopatria/rasters_colourmap/${year}.png`, `${h2}polities_Cliopatria/geojson_equirectangular/${year}.geojson`, { ignore_colours: [[0, 0, 0, 0], [182, 220, 244, 255], [216, 217, 218, 255], [217, 237, 249, 255], [144, 58, 0, 255], [255, 255, 219, 255], [0, 102, 182, 255], [0, 0, 102, 255], [182, 255, 255, 255], [58, 58, 58, 255], [0, 58, 144, 255], [219, 255, 255, 255], [219, 144, 58, 255], [58, 144, 219, 255], [182, 102, 0, 255], [255, 255, 182, 255], [102, 0, 0, 255], [102, 182, 255, 255], [0, 0, 58, 255], [144, 219, 255, 255], [255, 182, 102, 255], [255, 219, 144, 255], [0, 102, 144, 255], [58, 0, 0, 255], [255, 182, 144, 255], [144, 144, 102, 255], [219, 255, 182, 255], [144, 219, 182, 255] ] });
		
		if (!options.do_not_draw)
			main.mapmodes.mapmodes.geojson.draw(`${h2}polities_Cliopatria/geojson_equirectangular/${year}.geojson`);
	}
};