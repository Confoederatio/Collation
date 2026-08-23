window.discordRPC = {
	current_activity: {},
	
	updateActivity: (activity) => {
		try {
			discordRPC.current_activity = {
				...discordRPC.current_activity,
				...activity
			};
			ipcRenderer.send('update-presence', discordRPC.current_activity);
		} catch (e) { console.error(e); }
	},
};