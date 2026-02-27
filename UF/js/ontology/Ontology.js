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
		/**
		 * @type {boolean}
		 */
		static initialised = false;
		
		/**
		 * @type {Ontology[]}
		 */
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
			
			//Initialise Ontology first
			if (!Ontology._initialised) Ontology.initialise();
			
			//Declare local instance variables
			this.options = options;
			this.type = type;
			
			this.id = Ontology.getOntologyID();
			this.geometries = [];
			this.state = (state_array) ? state_array : [];
				if (!Array.isArray(this.state)) {
					if (typeof this.state === "string") this.state = JSON.parse(this.state);
					if (typeof this.state === "object") this.state = [this.state];
				}
			this.worker_type = (this.options.worker_type) ? this.options.worker_type : "";
				
			this._sortState(); //Sort state ascending by date, last entry is the head
				
			//Queue-based ID assignment
			Ontology.queue.push(this);
		}
		
		/**
		 * Given an array of fully-resolved snapshots (one per keyframe, indexed automatically to `this.state`), rewrite every keyframe's data so that the last entry is the full snapshot and every earlier entry is a negative diff against its successor.
		 * 
		 * @param {Object[]} arg0_snapshots
		 * @private
		 */
		_rebuildDiffsFromSnapshots (arg0_snapshots) {
			
		}
		
		_resolveStateAtIndex (arg0_index) {
			//Convert from parameters
			let index = Math.returnSafeNumber(arg0_index);
			
			if (this.state.length === 0) return {}; //Internal guard clause if state is empty
			if (index < 0 || index > this.state.length - 1) return {}; //Internal guard clause if state is invalid
			
			//Declare local instance variables
			let resolved = structuredClone(this.state[this.state.length - 1].data || {});
			
			//Walk backwards from head towards the requested index, applying each keyframe's stored diff to regress the state
			for (let i = this.state.length - 2; i >= index; i--) {
				let diff = (this.state[i].data || {});
				
				Object.iterate(diff, (local_key, local_value) => {
					if (local_value === null) {
						delete resolved[local_key]; //Null sentinel = key did not exist at that keyframe
					} else {
						resolved[local_key] = structuredClone(local_value);
					}
				});
			}
			
			//Return statement
			return resolved;
		}
		
		/**
		 * Sorts `this.state` in ascending order by `.date`. Last = head.
		 */
		_sortState () { this.state.sort((a, b) => a.date - b.date); }
		
		getState (arg0_date) {
			//Convert from parameters
			let date = Date.getDate(arg0_date);
			
			//Declare local instance variables
			let current_timestamp = date.getTime();
			
		}
		
		/**
		 * Applies relation/tag mutation fields onto a fully-resolved data object and returns the result (input is not mutated).
		 * 
		 * Order per category: set > add > remove.
		 * 
		 * @param {Object} arg0_resolved_data
		 * @param {Object} arg1_mutations
		 * 
		 * @returns {Object}
		 */
		static applyMutations (arg0_resolved_data, arg1_mutations) {
			//Convert from parameters
			let data = structuredClone(arg0_resolved_data);
			let mutations = arg1_mutations;
			
			//Initialise data
			if (!data._relations) data._relations = [];
			if (!data._tags) data._tags = [];
			
			//Relations
			if (mutations.set_relations)
				data._relations = structuredClone(mutations._relations);
			if (mutations.add_relations)
				for (let local_relation of mutations.add_relations)
					if (!data._relations.find((r) => (r.id === local_relation.id)))
						data._relations.push(structuredClone(local_relation));
			if (mutations.remove_relations)
				for (let local_relation of mutations.remove_relations) {
					let relation_id = (typeof local_relation === "string") ? local_relation : local_relation.id;
					data._relations = data._relations.filter((r) => r.id !== relation_id);
				}
			
			//Tags
			if (mutations.set_tags)
				data._tags = [...mutations.set_tags];
			if (mutations.add_tags)
				for (let local_tag of mutations.add_tags)
					if (!data._tags.includes(local_tag)) data._tags.push(local_tag);
			if (mutations.remove_tags)
				data._tags = data._tags.filter((t) => !mutations.remove_tags.includes(t));
			
			//Return statement
			return data;
		}
		
		static getOntologyID () {
			//Return statement
			return `${Date.now()}_${this.queue.length}`;
		}
		
		static initialise () {
			Ontology._initialised = true;
			Ontology.logic_loop = setInterval(() => {
				for (let i = 0; i < Ontology.queue.length; i++)
					Ontology.instances.push(Ontology.queue[i]);
				Ontology.queue = [];
			});
		}
	};
}