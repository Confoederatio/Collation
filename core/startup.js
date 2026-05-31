//Import modules
global.child_process = require("child_process");
global.cubic_spline = require("cubic-spline");
global.electron = require("electron");
global.exec = require("child_process").exec;
global.fs = require("fs");
global.JSDOM = require("jsdom").JSDOM;
global.JSON5 = require("json5");
global.mathjs = require("mathjs");
global.ml_matrix = require("ml-matrix");
global.net = require("net");
global.netcdfjs = require("netcdfjs");
global.path = require("path");
global.pngjs = require("pngjs");
global.polylabel = require("polylabel");
global.puppeteer = require("puppeteer");
global.util = require("util");

global.h1 = "./histmap/1.data_scraping/";
global.h2 = "./histmap/2.data_cleaning/";
global.h3 = "./histmap/3.data_merging/";
global.h4 = "./histmap/4.data_processing/";
global.h5 = "./histmap/5.data_post_processing/";
global.h6 = "./histmap/6.data_visualisation/";

global.l1d = "./livemap/1.workers/dashboard/";
global.l1e = "./livemap/1.workers/types/economics/";
global.l1m = "./livemap/1.workers/types/military/";
global.l1p = "./livemap/1.workers/types/politics/";
global.l2 = "./livemap/2.ontology/";
global.l3e = "./livemap/3.models/economics/";
global.l3m = "./livemap/3.models/military/";
global.l3p = "./livemap/3.models/politics/";
global.l4e = "./livemap/4.view/economics/";
global.l4m = "./livemap/4.view/military/";
global.l4p = "./livemap/4.view/politics/";

//Initialise functions
{
  global.initialiseGlobal = async function () {
		//KEEP AT TOP! Make sure file paths exist
		{
			if (!fs.existsSync("./saves/")) fs.mkdirSync("./saves/");
			loadSettings();
		}
		
		//Initialise global.scene
		global.scene = new ve.Scene({
			map_component: new ve.Map()
		});
			global.map = scene.map_component.map;
		
    //Declare global variables
    global.main = {
			hierarchy: {},
			interfaces: {
				date: new UI_DateMenu(),
				
				leftbar: new UI_Leftbar()
			},
			layers: {
				//Default Layers - for geometries with no layer
				label_collision_layer: new maptalks.VectorLayer("label_collision_layer", [], {
					collision: true,
					collisionDelay: 250,
					forceRenderOnMoving: true,
					forceRenderOnRotating: true,
					forceRenderOnZooming: true,
					
					hitDetect: false,
					interactive: false,
					zIndex: 1
				}),
				entity_layer: new maptalks.VectorLayer("entity_layer", [], {
					hitDetect: true,
					interactive: true,
					zIndex: 0
				})
			},
			map: map,
			settings: {},
			user: {}
    };
		Object.iterate(main.layers, (local_key, local_value) => local_value.addTo(map));
		
		//Initialise DB, process
		await db.initialise();
		await naissance.Renderer.setDate(Date.getCurrentDate());
  };
	
	global.loadSettings = function () {
		//Try to read from svea_settings.json if possible
		if (fs.existsSync("svea_settings.json")) {
			global.svea_settings = JSON.parse(fs.readFileSync("svea_settings.json", "utf8"));
		} else {
			console.warn(`svea_settings.json is not defined. API secrets and processes will not be processed.`);
		}
	};

  function trackPerformance () {
    //Declare local instance variables
		let { ipcRenderer } = require('electron');
    let frame_count = 0;
		let last_time = performance.now();

		//Track FPS
    function trackFPS() {
      frame_count++;
			let now = performance.now();

      //Report back to the main process once per second
      if (now - last_time >= 1000) {
        ipcRenderer.send('update-fps', frame_count);
        frame_count = 0;
        last_time = now;
      }

      //Keep the loop going
      requestAnimationFrame(trackFPS);
    }

    //Start the counter
    trackFPS();
  }
}

//Startup process
{
	global.is_naissance = true;
	ve.start({
		//Accepts wildcards (*), exclusionary patterns (!), and folders/file paths
		load_files: [
			"common",
			"!core/startup.js",
			"!core/archives",
			"!core/process/workers",
			"core",
			"core/render/data/entities",
			"core/render/data/brush",
			"core/process/",
			"histmap",
			"livemap"
		],
		special_function: function () {
			try {
				initialiseGlobal();	
			} catch (e) {
				console.error(e);
			}	
		}
	});

  trackPerformance();
}