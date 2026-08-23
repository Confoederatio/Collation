window.discordRPC = {
	updateActivity: (activity) => {
		try {
			ipcRenderer.send('update-presence', activity);
		} catch (e) { console.error(e); }
	},
};