//Initialise functions
{
	naissance.Geometry.Action_manageRelations = function () {
		//Declare local instance variables
		let relation_timestamp = (this.ui.add_relation_date !== undefined) ?
			Date.getTimestamp(this.ui.add_relation_date) : main.timestamp;
		let relation_mode = (this.ui.add_relation_mode || "direct");
		let relation_string;
		
		let existing_relations = [];
		let keyframe_obj = this.history.keyframes[relation_timestamp];
		try {
			existing_relations = keyframe_obj.value[2].variables.Relation;
			existing_relations = existing_relations.split(",").filter((item) => item.length > 0); //Prevent ,, artefacts
		} catch (e) {}
		
		//Declare local helper functions
		let _clearRelationsWithID = (id) => {
			for (let i = existing_relations.length - 1; i >= 0; i--) {
				let local_relation = existing_relations[i].split("-");
				
				if (local_relation[1] === String(id))
					existing_relations.splice(i, 1);
			}
		};
		let _getDirectRelationString = () => {
			//Return statement
			if (!this.ui.add_relation_with_id) {
				veToast(`<icon>warning</icon> You must select a valid geometry to add a relation with.`);
				return;
			}
			if (this.ui.add_relation_with_id === this.id) {
				veToast(`<icon>warning</icon> You cannot create a direct self-relationship.`);
				return;
			}
			if (!this.ui.add_relation_type || this.ui.add_relation_type.length === 0) {
				veToast(`<icon>warning</icon> You must specify a valid relation type.`);
				return;
			}
			return `add-${this.ui.add_relation_with_id}-${this.ui.add_relation_type}`;
		}
		let _getIndirectRelationString = () => {
			if (!this.ui.add_relation_type || this.ui.add_relation_type.length === 0) {
				veToast(`<icon>warning</icon> You must specify a valid relation type.`);
				return;
			}
			return `add-indirect-${this.ui.add_relation_type}`;
		}
		
		//Parse relation_mode for add/remove
		if (relation_mode === "clear") {
			//Simply clear Relation at timestamp
			DALS.Timeline.parseAction("remove_variable", [{
				geometry_obj: this.id,
				remove_variable: {
					date: relation_timestamp,
					key: "Relation"
				}
			}]);
			veToast(`Cleared all relations at this keyframe.`);
			
			return;
		} else if (relation_mode === "direct") {
			relation_string = _getDirectRelationString();
			if (!relation_string) return;
			
			if (existing_relations.includes(relation_string)) {
				veToast(`<icon>warning</icon> An identical relation already exists.`);
				return;
			}
			
			//Push to existing_relations
			existing_relations.push(relation_string);
		} else if (relation_mode === "indirect") {
			relation_string = _getIndirectRelationString();
			if (!relation_string) return;
			
			if (existing_relations.includes(relation_string)) {
				veToast(`<icon>warning</icon> An identical relation already exists.`);
				return;
			}
			
			existing_relations.push(relation_string);
		} else if (["remove_direct", "remove_indirect"].includes(relation_mode)) {
			relation_string = (relation_mode === "remove_direct") ? 
				_getDirectRelationString() : _getIndirectRelationString();
			if (!relation_string) return;
			
			//Iterate over all existing_relations and splice out indirect relationships that match
			for (let i = existing_relations.length - 1; i >= 0; i--)
				if (existing_relations[i] === relation_string)
					existing_relations.splice(i, 1);
		} else if (relation_mode === "replace") {
			relation_string = _getDirectRelationString();
			if (!relation_string) return;
			
			_clearRelationsWithID(this.ui.add_relation_with_id);
			
			existing_relations.push(relation_string);
		}
		
		//Modify Relation variable at timestamp
		DALS.Timeline.parseAction("add_variable", [{
			geometry_obj: this.id,
			add_variable: {
				date: relation_timestamp,
				key: "Relation",
				value: existing_relations.join(",")
			}
		}]);
		
		veToast(`Altered specified relation. Relations may be edited/removed in the Variables Editor.`);
	};
}