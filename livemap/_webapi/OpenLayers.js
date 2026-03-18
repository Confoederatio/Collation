Blacktraffic.AgentBrowser.webapi.OpenLayers = {
	captureMaps: function () {
		/**
		 * This script intercepts the OpenLayers Map constructor.
		 * It stores the map instance in window.capturedMap for easy access.
		 */
		let rawOl = undefined;
		
		Object.defineProperty(window, "ol", {
			get: function () {
				return rawOl;
			},
			set: function (value) {
				rawOl = value;
				
				// Check if the value being set is the OpenLayers object containing the Map constructor
				if (rawOl && rawOl.Map && !rawOl.Map.isIntercepted) {
					const OriginalMap = rawOl.Map;
					
					// Wrap the original constructor
					const MapProxy = function (options) {
						const instance = new OriginalMap(options);
						window.captured_map = instance;
						
						console.log("[WebAPI] OpenLayers Map captured:", instance);
						console.log(
							"[WebAPI] Access it via: window.captured_map",
						);
						
						return instance;
					};
					
					// Ensure inheritance and identification work correctly
					MapProxy.prototype = OriginalMap.prototype;
					MapProxy.isIntercepted = true;
					
					rawOl.Map = MapProxy;
				}
			},
			configurable: true,
			enumerable: true,
		});
	}
};