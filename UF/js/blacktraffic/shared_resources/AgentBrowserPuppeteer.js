if (!global.Blacktraffic) global.Blacktraffic = {};

/**
 * Creates a new Puppeteer browser agent used for scraping tasks and purposes.
 * 
 * ##### Constructor:
 * - `arg0_key=Class.generateRandomID(Blacktraffic.AgentBrowserPuppeteer)`: {@link string} - The key to use for the given browser agent. Used for ID.
 * - `arg1_options`: {@link Object}
 *   - `.chrome_binary_path`: {@link string}
 *   - `.debug_console=false`: {@link boolean}
 *   - `.debugging_port=0`: {@link number}
 *   - `.headless=false`: {@link boolean}
 *   - `.onload`: {@link function}
 *   - `.user_data_folder`: {@link string} - Refers to a Chrome profile necessary for spoofing.
 *   - 
 *   - `.connection_attempts_threshold=3` - The number of connection attempts to use when opening the browser.
 * 
 * @type {Blacktraffic.AgentBrowserPuppeteer}
 */
Blacktraffic.AgentBrowserPuppeteer = class {
	static instances = [];
	
	constructor (arg0_key, arg1_options) {
		//Convert from parameters
		let key = (arg0_key) ? arg0_key : Class.generateRandomID(Blacktraffic.AgentBrowserPuppeteer);
		let options = (arg1_options) ? arg1_options : {};
		
		//Initialise options
		if (options.headless === undefined) options.headless = false;
		
		options.connection_attempts_threshold = Math.returnSafeNumber(options.connection_attempts_threshold, 3);
		
		//Declare local instance variables
		this.key = key;
		this.options = options;
		
		//Initialise and push to instances
		this.open().then(() => {
			if (this.options.onload)
				this.options.onload.call(this);
		});
		Blacktraffic.AgentBrowserPuppeteer.instances.push(this);
	}
	
	/**
	 * Initialises a Chrome instance and connects Puppeteer.
	 * 
	 * @returns {Promise<Blacktraffic.AgentBrowserPuppeteer>}
	 */
	async open () {
		//Declare local instance variables
		let attempts = 0;
		
		//Iterate over all attempts until threshold or the for loop exits
		for (let i = 0; i < this.options.connection_attempts_threshold.length; i++)
			try {
				let target_port = await Blacktraffic.getFreePort();
				
				//1. Run launch command
				this.launch_cmd = `"${Blacktraffic.getChromeBinaryPath()}" --remote-debugging-port=${Math.returnSafeNumber(this.options.debugging_port, target_port)}${(this.options.user_data_folder) ? ` --user-data-dir="${this.options.user_data_folder}"` : ""}`;
				exec(this.launch_cmd);
				
				//2. Connect to browser instance
				await Blacktraffic.sleep(1500);
				this.browser = await puppeteer.connect({
					browserURL: `http://localhost:${target_port}`,
					defaultViewport: null
				});
				console.log(`Blacktraffic.AgentBrowserPuppeteer: ${this.key} connected to port ${target_port}.`);
				break;
			} catch (e) {
				attempts++;
				console.warn(`Port collision or launch failure, retrying .. ${attempts}/${this.options.connection_attempts_threshold}`);
				await Blacktraffic.sleep(500);
			}
		
		if (!this.browser) console.error(`Blacktraffic.AgentBrowserPuppeteer: ${this.key} failed to connect to a browser.`);
		
		//Return statement
		return this;
	}
};

/**
 * Attempts to return the Chrome binary path.
 * 
 * @returns {string}
 */
Blacktraffic.getChromeBinaryPath = function () {
	//Declare local instance variables
	let os_platform = Blacktraffic.getOS();
	
	//Handle Windows
	if (os_platform === "win") {
		let suffix = "/Google/Chrome/Application/chrome.exe";
		let prefixes = [process.env.LOCALAPPDATA, process.env.ProgramFiles, process.env["PROGRAMFILES(X86)"]];
		
		for (let local_prefix of prefixes)
			if (local_prefix) {
				let chrome_path = path.join(local_prefix, suffix);
				if (fs.existsSync(chrome_path)) return chrome_path;
			}
	} else if (os_platform === "lin") {
		let chrome_path = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
		if (fs.existsSync(chrome_path)) return chrome_path;
	} else {
		let binaries = ["google-chrome", "google-chrome-stable", "chromium"];
		
		for (let local_binary of binaries)
			try {
				let chrome_path = child_process.execSync(`which ${local_binary}`, { stdio: "pipe" })
					.toString().trim();
				if (chrome_path && fs.existsSync(chrome_path)) return chrome_path;
			} catch (e) {} //Which returns non-zero exit code if not found
	}
};