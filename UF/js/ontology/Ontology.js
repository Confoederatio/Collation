//Initialise functions
{
	/**
	 * Represents Ontologies which have been hydrated and streamed-in from a set database.
	 * 
	 * ##### Constructor:
	 * - `arg0_type="Ontology"`: {@link string} - The Ontology subclass/type to reference.
	 * - `arg2_options`: {@link Object}
	 *   - `.worker_type`: {@link string} - The worker from which the Ontology originated
	 * 
	 * @type {Ontology}
	 */
	global.Ontology = class {
		static instances = [];
		
		/**
		 * @type {string}
		 */
		static ontology_folder_path = "";
		
		/**
		 * @type {Ontology[]}
		 */
		static queue = [];
		
		constructor (arg0_type, arg1_state_array, arg2_options) {
			//Convert from parameters
			let type = (arg0_type) ? arg0_type : "Ontology";
			let state_array = (arg1_state_array) ? arg1_state_array : [];
			let options = (arg2_options) ? arg2_options : {};
			
			//Declare local instance variables
			this.geometries = [];
			this.state = (state_array) ? state_array : [];
				if (!Array.isArray(this.state)) {
					if (typeof this.state === "string") this.state = JSON.parse(this.state);
					if (typeof this.state === "object") this.state = [this.state];
				}
		}
		
		getState (arg0_date) {
			//Convert from parameters
			let date = (typeof arg0_date === "number") ? new Date(arg0_date) : arg0_date;
		}
		
		toJSON () {
			
		}
		
		static fromJSON (arg0_json) {
			
		}
		
		static getOntologyID () {
			//Return statement
			return `${Date.now()}_${this.queue.length}`;
		}
	};
}