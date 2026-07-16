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
		this.max_buffer_size = 8192;
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
		this.marker = undefined;
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
	
	bindEvents() {
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
	commitKeyframe(arg0_symbol_obj) {
		let symbol_obj = arg0_symbol_obj;
		let marker_coord = this.marker ? this.marker.getCoordinates() : map.getCenter();
		
		this.history.addKeyframe(
			main.date,
			{
				center: [marker_coord.x, marker_coord.y],
				mesh_points: JSON.parse(JSON.stringify(this.mesh_points)),
			},
			symbol_obj
		);
		this.draw();
	}
	
	draw() {
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
				let coords_obj = this.value[0];
				let symbol_obj = this.value[1];
				
				// Only update mesh from history if we aren't currently interacting to prevent state jumping
				if (this.selected_point_index === null && coords_obj.mesh_points) {
					this.mesh_points = JSON.parse(JSON.stringify(coords_obj.mesh_points));
					this.updateTriangulation();
				}
				
				if (!this.marker) {
					this.marker = new maptalks.ui.UIMarker(coords_obj.center, {
						draggable: false,
						single: false,
						content: this.canvas,
					});
					this.marker.addTo(map).show();
				} else {
					this.marker.setCoordinates(new maptalks.Coordinate(coords_obj.center));
					this.marker.show();
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
			if (this.marker) this.marker.hide();
		}
		
		if (this.marker && !derender_geometry) this.history.draw(this.keyframes_ui);
	}
	
	getLngLatToWorld(lng, lat) {
		let marker_coord = this.marker.getCoordinates();
		let zoom_factor = this.getScaleFactor();
		let center_px = map.coordinateToContainerPoint(marker_coord);
		let target_px = map.coordinateToContainerPoint(new maptalks.Coordinate(lng, lat));
		let delta_x = target_px.x - center_px.x;
		let delta_y = target_px.y - center_px.y;
		return {
			x: delta_x / zoom_factor + this.img_center,
			y: delta_y / zoom_factor + this.img_center,
		};
	}
	
	getScaleFactor() {
		return Math.pow(2, map.getZoom() - this.initial_zoom);
	}
	
	getWorldToLngLat(wx, wy) {
		let marker_coord = this.marker.getCoordinates();
		let zoom_factor = this.getScaleFactor();
		let delta_x = (wx - this.img_center) * zoom_factor;
		let delta_y = (wy - this.img_center) * zoom_factor;
		let center_px = map.coordinateToContainerPoint(marker_coord);
		let target_px = new maptalks.Point(center_px.x + delta_x, center_px.y + delta_y);
		let coordinate_result = map.containerPointToCoordinate(target_px);
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
		console.log(e);
		
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
			this.mesh_points.push({ x: event_pos.x, y: event_pos.y, src_x: source_x, src_y: source_y });
			this.selected_point_index = this.mesh_points.length - 1;
			this.updateTriangulation();
			this.render();
			this.commitKeyframe(); // Immediate commit for new points
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
			{ x: this.img_display_size, y: this.img_display_size, src_x: this.img_display_size, src_y: this.img_display_size },
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
		if (this.marker) this.marker.remove();
		super.remove(arg0_do_not_refresh);
	}
	
	render() {
		if (!this.image || !this.image.complete || this.image.naturalWidth === 0) return;
		this.updateBufferSize();
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.save();
		this.ctx.scale(this.buffer_scale, this.buffer_scale);
		this.ctx.translate(this.buffer_offset, this.buffer_offset);
		
		let warp_mode = this.value[1]?.warp_mode ? this.value[1].warp_mode : "triangulation";
		if (warp_mode === "tps" && this.mesh_points.length >= 3) {
			let coeffs = Geospatiale.computeTPSCoefficients(this.mesh_points);
			Geospatiale.renderTPSGrid(
				this.ctx,
				this.image,
				this.img_display_size,
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
	
	updateBufferSize() {
		let factor = this.getScaleFactor();
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
		this.buffer_scale = Math.min(1, this.max_buffer_size / this.world_size);
		let target_size = Math.ceil(this.world_size * this.buffer_scale);
		if (this.canvas.width !== target_size || this.canvas.height !== target_size) {
			this.canvas.width = target_size;
			this.canvas.height = target_size;
		}
		this.buffer_offset = this.world_size / 2 - this.img_center;
		this.updateCssSize();
	}
	
	updateCssSize() {
		let factor = this.getScaleFactor();
		this.canvas.style.width = this.world_size * factor + "px";
		this.canvas.style.height = this.world_size * factor + "px";
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
		let tl = this.getWorldToLngLat(-this.buffer_offset, -this.buffer_offset);
		let br = this.getWorldToLngLat(this.world_size - this.buffer_offset, this.world_size - this.buffer_offset);
		this.extent_area.value =
			"[" + tl[0].toFixed(6) + ", " + tl[1].toFixed(6) + "]\n[" + br[0].toFixed(6) + ", " + br[1].toFixed(6) + "]";
	}
	
	updateTriangulation() {
		if (this.mesh_points.length < 3) {
			this.mesh_triangles = [];
			return;
		}
		this.mesh_triangles = Geospatiale.delaunayTriangulate(this.mesh_points, this.img_center);
	}
	
	drawUI() {
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
						return { x: world.x, y: world.y, src_x: existing ? existing.src_x : world.x, src_y: existing ? existing.src_y : world.y };
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
};