global.polities_RunningReality_Worker = class extends Blacktraffic.Worker {
	static bf = `${h1}/polities_RunningReality/`;
	
	constructor (arg0_options) {
		//Convert from parameters
		let options = (arg0_options) ? arg0_options : {};
		
		//Initialise options
		super("polities_RunningReality", {
			...options,
			interval: Infinity,
			do_not_close_tab: true,
			log_channel: "polities_RunningReality"
		});
		
		//Initialise options
		if (!options.get_types) options.get_types = ["Nation", "Province", "CulturalGroup"]; 
		
		//Declare local instance variables
		this.options = options;
		this.static = polities_RunningReality_Worker;
		
		//Start worker
		if (this.is_enabled && this.options.interval > 0)
			this.startInterval();
	}
	
	async execute (arg0_tab, arg1_instance, arg2_options) {
		//Convert from parameters
		let tab = arg0_tab;
		let instance = arg1_instance;
		let options = (arg2_options) ? arg2_options : {};
		
		options.start_year = Math.returnSafeNumber(options.start_year, -3200);
		options.end_year = Math.returnSafeNumber(options.end_year, 2026);
		
		//Declare local instance variables
		let all_countries = [];
		let webapi = Blacktraffic.AgentBrowser.webapi;
		
		if (!tab._scripts_injected) {
			await tab.evaluateOnNewDocument(webapi.OpenLayers.captureMaps);
			tab._scripts_injected = true;
		}
		
		//Check if #jLoadingIndicator is present, once not present run the script
		for (let i = options.start_year; i < options.end_year + 1; i++) {
			
		}
		await tab.goto()
		await Blacktraffic.sleep(Math.randomNumber(1000, 5000));
		await tab.waitForSelector("#jLoadingIndicator", { hidden: true });
		
		let geometries = await tab.evaluate(function () {
			//Declare local instance variables
			let results = [];
			let return_array = [];
		});
	}
};