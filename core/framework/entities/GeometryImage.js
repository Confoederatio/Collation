naissance.GeometryImage = class extends naissance.Geometry {
	static hierarchy_symbol = {
		icon: "image",
		name: "Image",
	};
	
	constructor() {
		super();
		this.class_name = "GeometryImage";
		this.node_editor_mode = "Image";
		
		//Declare canvas/render state logic from ImageOverlayWarp
		this.canvas = document.createElement("canvas");
		this.ctx = this.canvas.getContext("2d");
		
		this.img_display_size = 400;
		this.img_center = this.img_display_size / 2;
		this.base_screen_padding = 400;
		this.max_buffer_size = 4096;
		this.buffer_offset = 0;
		this.buffer_scale = 1;
		this.world_size = 0;
		
		this.tps_coeffs_x = [];
		this.tps_coeffs_y = [];
		this.grid_resolution = 20;
		
		this.canvas.width = this.img_display_size + 200;
		this.canvas.height = this.canvas.width;
		this.canvas.style.transformOrigin = "center center";
		
		this.base_point_radius = 6;
		this.base_hitbox_radius = 20;
		
		this.image = undefined;
		this.initial_zoom = map.getZoom();
		this.geometry = undefined;
		this.mesh_points = [];
		this.mesh_triangles = [];
		this.selected_point_index = null;
		this._is_dragging = false;
		
		//Initialise mesh and bind events
		this.initMesh();
		this.bindEvents();
		
		//Add keyframe with default coords/symbol upon instantiation
		let map_centre = map.getCenter();
		this.addKeyframe(
			main.date,
			{
				center: [map_centre.x, map_centre.y],
				mesh_points: JSON.parse(JSON.stringify(this.mesh_points)),
				initial_zoom: this.initial_zoom,
			},
			{
				image_url: "",
				opacity: 0.45,
				warp_mode: "triangulation",
			}
		);
		
		this.draw();
		
		//KEEP AT BOTTOM!
		this.updateOwner();
	}
	
	bindEvents () {
		//Canvas interactive events
		this.canvas.addEventListener("mousedown", (e) => this.handleMouseDown(e));
		this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
		this.canvas.addEventListener("mouseup", () => {
			if (this.selected_point_index !== null) {
				this.selected_point_index = null;
				if (this._is_dragging) {
					this._is_dragging = false;
					this.commitKeyframe();
				}
			}
		});
		this.canvas.addEventListener("dblclick", (e) => this.handleDoubleClick(e));
		
		//Map state triggers
		map.addEventListener("zoomend", () => {
			this.updateCssSize();
			this.render();
		});
	}
	
	/**
	 * Commits current working mesh and center to history.
	 */
	commitKeyframe (arg0_symbol_obj) {
		let symbol_obj = arg0_symbol_obj;
		let marker_coord = this.geometry ? this.geometry.getCoordinates() : map.getCenter();
		
		this.history.addKeyframe(
			main.date,
			{
				center: [marker_coord.x, marker_coord.y],
				mesh_points: JSON.parse(JSON.stringify(this.mesh_points)),
				initial_zoom: this.initial_zoom,
			},
			symbol_obj
		);
		this.draw();
	}
	
	draw () {
		let derender_geometry = false;
		
		this.value = this.history.getKeyframe({
			date: main.date,
			guaranteed_indexes: [1],
		}).value;
		this.value[1] = this.getSymbol(this.value[1]);
		
		if (this.value === undefined || this.value.length === 0 || this._is_visible === false) derender_geometry = true;
		
		if (this.value && !this.value[0]) derender_geometry = true;
		if (this.value && this.value[2]) {
			if (this.value[2].hidden) derender_geometry = true;
			if (this.value[2].max_zoom && map.getZoom() > this.value[2].max_zoom) derender_geometry = true;
			if (this.value[2].min_zoom && map.getZoom() < this.value[2].min_zoom) derender_geometry = true;
		}
		
		if (!derender_geometry) {
			try {
				// Safety check: Don't attempt to add UI Markers if the map or its UI container isn't ready
				if (!map || !map.isLoaded()) return;
				
				let coords_obj = this.value[0];
				let symbol_obj = this.value[1];
				
				if (coords_obj.initial_zoom !== undefined) {
					this.initial_zoom = coords_obj.initial_zoom;
				}
				
				if (this.selected_point_index === null && coords_obj.mesh_points) {
					this.mesh_points = JSON.parse(JSON.stringify(coords_obj.mesh_points));
					this.updateTriangulation();
				}
				
				if (!this.geometry) {
					this.geometry = new maptalks.ui.UIMarker(coords_obj.center, {
						draggable: false,
						single: false,
						content: this.canvas,
					});
					this.geometry.addTo(map);
				} else {
					this.geometry.setCoordinates(new maptalks.Coordinate(coords_obj.center));
				}
				
				// Only call show if the marker has a map and the map has a UI container
				if (this.geometry.getMap()) {
					try {
						this.geometry.show();
					} catch (e) {
						this.geometry.addTo(map);
						this.geometry.show();
					}
				}
				
				this.canvas.style.opacity = symbol_obj.opacity !== undefined ? symbol_obj.opacity : 0.45;
				if (symbol_obj.image_url !== this._loaded_image_url) {
					this._loaded_image_url = symbol_obj.image_url;
					this.loadImage(symbol_obj.image_url);
				}
				
				this.render();
			} catch (e) {
				console.error(e);
			}
		} else {
			if (this.geometry) this.geometry.hide();
		}
		
		if (this.geometry && !derender_geometry) this.history.draw(this.keyframes_ui);
	}
	
	drawUI () {
		if (!this.points_area) {
			this.points_area = document.createElement("textarea");
			this.points_area.rows = 8;
			this.points_area.style.fontFamily = "monospace";
			this.points_area.addEventListener("input", () => {
				let area_coords = Geospatiale.parseCoords(this.points_area.value);
				if (area_coords.length > 0) {
					this.mesh_points = area_coords.map((c, i) => {
						let world = this.getLngLatToWorld(c[0], c[1]);
						let existing = this.mesh_points[i];
						return {
							x: world.x,
							y: world.y,
							src_x: existing ? existing.src_x : world.x,
							src_y: existing ? existing.src_y : world.y,
						};
					});
					this.updateTriangulation();
					this.commitKeyframe();
				}
			});
			this.extent_area = document.createElement("textarea");
			this.extent_area.rows = 3;
			this.extent_area.style.fontFamily = "monospace";
			this.extent_area.addEventListener("input", () => {
				let extent = Geospatiale.parseCoords(this.extent_area.value);
				if (extent.length >= 2 && this.mesh_points.length >= 4) {
					let tl = extent[0],
						br = extent[1];
					let corners = [tl, [br[0], tl[1]], br, [tl[0], br[1]]];
					corners.forEach((coord, i) => {
						let world = this.getLngLatToWorld(coord[0], coord[1]);
						this.mesh_points[i].x = world.x;
						this.mesh_points[i].y = world.y;
					});
					this.commitKeyframe();
				}
			});
		}
		return {
			edit_image_ui: veInterface(
				{
					warp_mode_select: veSelect(
						{ triangulation: { name: "Affine Triangles" }, tps: { name: "Thin Plate Spline" } },
						{
							name: "Warp Mode",
							selected: this.value[1]?.warp_mode || "triangulation",
							onuserchange: (v) => this.commitKeyframe({ warp_mode: v }),
						}
					),
					points_label: veHTML("Control Points [Lng, Lat]"),
					points_area: veHTML(this.points_area),
					extent_label: veHTML("Canvas Extent [TL, BR]"),
					extent_area: veHTML(this.extent_area),
					opacity_slider: veRange(Math.returnSafeNumber(this.value[1]?.opacity, 0.45), {
						name: "Opacity",
						min: 0,
						max: 1,
						step: 0.01,
						onuserchange: (v) => {
							this.canvas.style.opacity = v;
							this.commitKeyframe({ opacity: v });
						},
					}),
					url_input: veText(this.value[1]?.image_url || "", {
						name: "Image URL",
						onuserchange: (v) => this.commitKeyframe({ image_url: v }),
					}),
				},
				{ name: "Edit Image", open: true }
			),
		};
	}
	
	getLngLatToWorld(lng, lat) {
		let projection = map.getProjection();
		let marker_coord = this.geometry.getCoordinates();
		let res = map.getResolution(this.initial_zoom);
		
		// Get absolute projection coordinates (e.g., meters)
		let center_auc = projection.project(marker_coord);
		let target_auc = projection.project(new maptalks.Coordinate(lng, lat));
		
		// Convert difference in projection units to pixels at the fixed initial zoom
		// Note: y is inverted in screen space relative to projection space
		let delta_x = (target_auc.x - center_auc.x) / res;
		let delta_y = (center_auc.y - target_auc.y) / res;
		
		return {
			x: delta_x + this.img_center,
			y: this.img_center - delta_y,
		};
	}
	
	getScaleFactor() {
		// Use maptalks' own resolution model rather than 2^dz — maptalks interpolates
		// resolutions linearly between integer zooms for fractional zoom levels, so a
		// pure exponential drifts cyclically (worst mid-level, resetting at integers)
		return map.getResolution(this.initial_zoom) / map.getResolution(map.getZoom());
	}
	
	getWorldToLngLat(wx, wy) {
		let projection = map.getProjection();
		let marker_coord = this.geometry.getCoordinates();
		let res = map.getResolution(this.initial_zoom);
		
		let center_auc = projection.project(marker_coord);
		
		// Calculate target projection coordinates from pixel deltas
		let target_auc = new maptalks.Coordinate(
			center_auc.x + (wx - this.img_center) * res,
			center_auc.y - (wy - this.img_center) * res
		);
		
		let coordinate_result = projection.unproject(target_auc);
		return [coordinate_result.x, coordinate_result.y];
	}
	
	handleDoubleClick(e) {
		if (!this.selected) return;
		
		let event_pos = Geospatiale.convertEventToWorld(
			e,
			this.canvas.getBoundingClientRect(),
			this.getScaleFactor(),
			this.buffer_offset
		);
		let point_idx = Geospatiale.getPointIndexAt(
			event_pos.x,
			event_pos.y,
			this.mesh_points,
			this.getScaleFactor(),
			this.base_hitbox_radius
		);
		if (point_idx !== null) {
			this.mesh_points.splice(point_idx, 1);
			this.updateTriangulation();
			this.commitKeyframe();
		}
	}
	
	handleMouseDown(e) {
		if (!this.selected) return;
		if (e.button === 1) return;
		
		let event_pos = Geospatiale.convertEventToWorld(
			e,
			this.canvas.getBoundingClientRect(),
			this.getScaleFactor(),
			this.buffer_offset
		);
		this.selected_point_index = Geospatiale.getPointIndexAt(
			event_pos.x,
			event_pos.y,
			this.mesh_points,
			this.getScaleFactor(),
			this.base_hitbox_radius
		);
		this._is_dragging = false;
		
		if (this.selected_point_index === null) {
			let source_x = event_pos.x;
			let source_y = event_pos.y;
			for (let i = 0; i < this.mesh_triangles.length; i += 3) {
				let pt1 = this.mesh_points[this.mesh_triangles[i]];
				let pt2 = this.mesh_points[this.mesh_triangles[i + 1]];
				let pt3 = this.mesh_points[this.mesh_triangles[i + 2]];
				let bary_info = Geospatiale.getBarycentric(event_pos, pt1, pt2, pt3);
				if (bary_info.inside) {
					source_x = bary_info.u * pt1.src_x + bary_info.v * pt2.src_x + bary_info.w * pt3.src_x;
					source_y = bary_info.u * pt1.src_y + bary_info.v * pt2.src_y + bary_info.w * pt3.src_y;
					break;
				}
			}
			this.mesh_points.push({
				x: event_pos.x,
				y: event_pos.y,
				src_x: source_x,
				src_y: source_y,
			});
			this.selected_point_index = this.mesh_points.length - 1;
			this.updateTriangulation();
			this.render();
			this.commitKeyframe();
		}
	}
	
	handleMouseMove(e) {
		if (!this.selected) return;
		
		if (this.selected_point_index !== null) {
			this._is_dragging = true;
			let event_pos = Geospatiale.convertEventToWorld(
				e,
				this.canvas.getBoundingClientRect(),
				this.getScaleFactor(),
				this.buffer_offset
			);
			this.mesh_points[this.selected_point_index].x = event_pos.x;
			this.mesh_points[this.selected_point_index].y = event_pos.y;
			this.render();
		}
	}
	
	initMesh() {
		this.mesh_points = [
			{ x: 0, y: 0, src_x: 0, src_y: 0 },
			{ x: this.img_display_size, y: 0, src_x: this.img_display_size, src_y: 0 },
			{
				x: this.img_display_size,
				y: this.img_display_size,
				src_x: this.img_display_size,
				src_y: this.img_display_size,
			},
			{ x: 0, y: this.img_display_size, src_x: 0, src_y: this.img_display_size },
		];
		this.updateTriangulation();
	}
	
	loadImage(url) {
		this.image = new Image();
		this.image.onload = () => this.render();
		this.image.onerror = () => console.error("Image failed to load:", this.image.src);
		let pattern_check = /\.(jpeg|jpg|gif|png|webp|svg|bmp)$|^data:image/i;
		this.image.src =
			url && pattern_check.test(url)
				? url
				: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
	}
	
	remove(arg0_do_not_refresh) {
		if (this.geometry) this.geometry.remove();
		super.remove(arg0_do_not_refresh);
	}
	
	render () {
		if (!this.image || !this.image.complete || this.image.naturalWidth === 0) return;
		this.updateBufferSize();
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.save();
		
		// Derive scale from the actual (integer) canvas size so the buffer spans
		// exactly world_size world units — using the ideal buffer_scale here leaves
		// a sub-pixel ceil() remainder that shifts the image slightly per zoom level
		let render_scale = this.canvas.width / this.world_size;
		this.ctx.scale(render_scale, render_scale);
		this.ctx.translate(this.buffer_offset, this.buffer_offset);
		
		let warp_mode = this.value[1]?.warp_mode ? this.value[1].warp_mode : "triangulation";
		if (warp_mode === "tps" && this.mesh_points.length >= 3) {
			let coeffs = Geospatiale.computeTPSCoefficients(this.mesh_points);
			Geospatiale.renderTPSGrid(
				this.ctx,
				this.image,
				this.img_display_size, // Source coordinate space
				this.grid_resolution,
				this.mesh_points,
				coeffs.x,
				coeffs.y
			);
		} else {
			for (let i = 0; i < this.mesh_triangles.length; i += 3) {
				let p1 = this.mesh_points[this.mesh_triangles[i]],
					p2 = this.mesh_points[this.mesh_triangles[i + 1]],
					p3 = this.mesh_points[this.mesh_triangles[i + 2]];
				Geospatiale.drawTriangle(
					this.ctx,
					this.image,
					this.img_display_size,
					{ x: p1.src_x, y: p1.src_y },
					{ x: p2.src_x, y: p2.src_y },
					{ x: p3.src_x, y: p3.src_y },
					p1,
					p2,
					p3
				);
			}
		}
		
		if (this.selected)
			Geospatiale.drawMeshOverlay(
				this.ctx,
				this.mesh_points,
				this.mesh_triangles,
				this.getScaleFactor(),
				this.base_point_radius,
				this.selected_point_index
			);
		this.ctx.restore();
		this.updateInfoPanels();
	}
	
	updateBufferSize () {
		let factor = this.getScaleFactor();
		let dpr = window.devicePixelRatio || 1;
		let padding = this.base_screen_padding / factor;
		let min_x = this.img_center,
			max_x = this.img_center,
			min_y = this.img_center,
			max_y = this.img_center;
		
		this.mesh_points.forEach((p) => {
			min_x = Math.min(min_x, p.x);
			max_x = Math.max(max_x, p.x);
			min_y = Math.min(min_y, p.y);
			max_y = Math.max(max_y, p.y);
		});
		
		let max_ext = Math.max(
			Math.abs(min_x - this.img_center),
			Math.abs(max_x - this.img_center),
			Math.abs(min_y - this.img_center),
			Math.abs(max_y - this.img_center)
		);
		
		this.world_size = Math.ceil((max_ext + padding) * 2);
		
		// Calculate buffer scale based on the current map scale factor to maintain resolution
		// We cap it so we don't exceed max_buffer_size, but otherwise target 1:1 pixel ratio
		this.buffer_scale = Math.min(factor, this.max_buffer_size / (this.world_size * dpr));
		
		let target_width = Math.ceil(this.world_size * this.buffer_scale * dpr);
		let target_height = Math.ceil(this.world_size * this.buffer_scale * dpr);
		
		if (this.canvas.width !== target_width || this.canvas.height !== target_height) {
			this.canvas.width = target_width;
			this.canvas.height = target_height;
		}
		
		this.buffer_offset = this.world_size / 2 - this.img_center;
		this.updateCssSize();
	}
	
	updateCssSize() {
		let factor = this.getScaleFactor();
		// Round to whole CSS pixels so UIMarker's integer size measurement
		// matches the layout size exactly (avoids half-pixel centering error)
		let css_size = Math.round(this.world_size * factor);
		this.canvas.style.width = css_size + "px";
		this.canvas.style.height = css_size + "px";
	}
	
	updateInfoPanels() {
		if (!this.points_area || document.activeElement === this.points_area || document.activeElement === this.extent_area)
			return;
		
		this.points_area.value = this.mesh_points
		.map((p) => {
			let c = this.getWorldToLngLat(p.x, p.y);
			return "[" + c[0].toFixed(6) + ", " + c[1].toFixed(6) + "]";
		})
		.join("\n");
		
		if (this.mesh_points.length > 0) {
			let min_x = Infinity;
			let min_y = Infinity;
			let max_x = -Infinity;
			let max_y = -Infinity;
			
			for (let i = 0; i < this.mesh_points.length; i++) {
				let p = this.mesh_points[i];
				if (p.x < min_x) min_x = p.x;
				if (p.y < min_y) min_y = p.y;
				if (p.x > max_x) max_x = p.x;
				if (p.y > max_y) max_y = p.y;
			}
			
			let tl_coords = this.getWorldToLngLat(min_x, min_y);
			let br_coords = this.getWorldToLngLat(max_x, max_y);
			
			this.extent_area.value =
				"[" +
				tl_coords[0].toFixed(6) +
				", " +
				tl_coords[1].toFixed(6) +
				"]\n[" +
				br_coords[0].toFixed(6) +
				", " +
				br_coords[1].toFixed(6) +
				"]";
		}
	}
	
	updateTriangulation () {
		if (this.mesh_points.length < 3) {
			this.mesh_triangles = [];
			return;
		}
		this.mesh_triangles = Geospatiale.delaunayTriangulate(this.mesh_points, this.img_center);
	}
};