if (!global.Blacktraffic) global.Blacktraffic = {};

/**
 * ##### Constructor:
 * - `arg0_type`: {@link string}
 * - `arg1_options`: {@link Object}
 *   - `.config_file_path`: {@link string} - The config JSON5 file to load. Accessible at `.config`.
 *   - `.do_not_close_tab`: {@link boolean}
 *   - `.log_channel="${worker}_type"`: {@link string}
 *   - `.special_function`: {@link function} | {@link Array}<{@link Ontology}>
 *   - `.tags=[]`: {@link Array}<{@link string}>
 * 
 * @type {Blacktraffic.Worker}
 */
Blacktraffic.Worker = class { //[WIP] - Should be refactored in future to work with multiple browsers. Requires multiple copychecks and passes to ensure the contract is fulfilled.
	static browser_obj;
	
	/**
	 * //[WIP] - This needs to be changed to be fetched dynamically based on OS
	 * @type {string}
	 */
	static input_chrome_profile = path.resolve(`${process.env.LOCALAPPDATA}/Google/Chrome/User Data/Profile 1`);
	
	/**
	 * @type {string}
	 */
	static saves_folder = `./livemap/1.workers/dashboard/`;
	
	/**
	 * @type {{ "<worker_type_key>": Object[] }}
	 */
	static workers_obj = {};
	
	constructor (arg0_type, arg1_options) {
		//Convert from parameters
		let type = arg0_type;
		let options = (arg1_options) ? arg1_options : {};
		
		//Initialise options
		if (options.do_not_close_tab === undefined) options.do_not_close_tab = false;
		options.log_channel = (options.log_channel) ? options.log_channel : `worker_${type}`;
		options.tags = (options.tags) ? options.tags : [];
		
		//Declare local instance variables
		this.config = (options.config_file_path && fs.existsSync(options.config_file_path)) ? 
			JSON5.parse(fs.readFileSync(options.config_file_path)) : {};
		this.console = (!log[options.log_channel]) ?
			new log.Channel(options.log_channel) : log[`${options.log_channel}_instance`];
		this.is_enabled = true;
		this.options = options;
		this.static = Blacktraffic.Worker;
		this.type = type;
		
		this.current_job_status = "idle";
		this.jobs = []; //Internal job history
		
		//Append to workers_obj
		if (!this.static.workers_obj[type]) this.static.workers_obj[type] = [];
			let worker_array = this.static.workers_obj[type];
			worker_array.push(this);
			this.worker_id = structuredClone(worker_array.length)
		this.name = `${type} #${this.worker_id}`;
	}
	
	async disable () {
		//Declare local instance variables
		let current_tab = await this.getTab();
		this.is_enabled = false;
		
		//Close any currently open tasks
		if (current_tab) await current_tab.close();
		if (this.console) this.console.log(`${this.name} disabled.`);
	}
	
	async enable () {
		this.is_enabled = true;
		if (this.console) this.console.log(`${this.name} enabled.`);
	}
	
	async getBrowser () {
		//Ensure a browser context is accessible
		if (!this.static.browser_obj?.browser) 
			this.static.browser_obj = await new Promise((resolve) => {
				let browser = new Blacktraffic.AgentBrowserPuppeteer(undefined, {
					onload: () => resolve(browser),
					user_data_folder: this.static.input_chrome_profile
				});
			}); 
		this._browser = this.static.browser_obj;
		
		//Return statement
		return this._browser;
	}
	
	getCurrentStatus () { return this.current_job_status; }
	
	getCurrentTimeStatus () {
		//Declare local instance variables
		let current_status;
			if (this.jobs.length === 0) {
				current_status = "idle";
			} else {
				current_status = (this.current_job_status === "running") ? "running" : "done";
			}
		let last_job = this.jobs[this.jobs.length - 1];
		
		//Return statement
		return {
			status: current_status,
			timestamp: (last_job) ? last_job.timestamp : Date.now()
		};
	}
	
	async getTab () {
		//Ensure a tab context is accessible
		if (!this._browser) await this.getBrowser();
		
		//Declare local instance variables
		let current_tab = this._browser.getTab(this.getTabID());
		
		//Return statement
		if (!current_tab) {
			return this._browser.openTab(this.getTabID());
		} else {
			//Return statement
			return current_tab;
		}
	}
	
	getTabID () { return `${this.type}_${this.worker_id}`; }
	
	
};