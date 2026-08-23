window.discordRPC = {
	config_obj: undefined,
	current_activity: {},
	
	loadConfig: () => {
		if (fs.existsSync("./common/defines/social_media/discord.json"))
			discordRPC.config_obj = JSON.parse(fs.readFileSync("./common/defines/social_media/discord.json", "utf8"));
		discordRPC.current_activity = discordRPC.config_obj.default_activity;
	},
	updateActivity: (template_id, formatting_args, custom_activity) => {
		if (discordRPC.config_obj === undefined) discordRPC.loadConfig();
		
		try {
			let target_activity = {};
			
			if (typeof template_id === "string") {
				let template_obj = discordRPC.config_obj[template_id] ? JSON.parse(JSON.stringify(discordRPC.config_obj[template_id])) : {};
				
				if (formatting_args !== undefined) {
					let args_array = Array.isArray(formatting_args) ? formatting_args : [formatting_args];
					let stringified_template = JSON.stringify(template_obj);
					
					for (let i = 0; i < args_array.length; i++)
						stringified_template = stringified_template.replaceAll("£" + i + "£", args_array[i]);
					
					template_obj = JSON.parse(stringified_template);
				}
				
				target_activity = template_obj;
			} else if (typeof template_id === "object" && template_id !== null) {
				target_activity = template_id;
			}
			
			if (custom_activity && typeof custom_activity === "object")
				target_activity = { ...target_activity, ...custom_activity };
			
			discordRPC.current_activity = {
				...discordRPC.current_activity,
				...target_activity
			};
			ipcRenderer.send("discord-update-presence", discordRPC.current_activity);
		} catch (e) { console.error(e); }
	}
};