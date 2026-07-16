naissance.GeometryImage = class extends naissance.Geometry {
	static hierarchy_symbol = {
		icon: "image",
		name: "Image",
	};
	
	constructor() {
		super();
		this.class_name = "GeometryImage";
		this.node_editor_mode = "Image";
		
		// Create a wrapper container. UIMarker acts simply as a 0x0 anchor point.
		this.dom_wrapper = document.createElement("div");
		this.dom_wrapper.style.pointerEvents = "none";
		this.dom_wrapper.style.display = "flex";
		this.dom_wrapper.style.justifyContent = "center";
		this.dom_wrapper.style.alignItems = "center";
		this.dom_wrapper.style.width = "0px";
		this.dom_wrapper.style.height = "0px";
		this.dom_wrapper.style.overflow = "visible";
		this.dom_wrapper.style.perspective = "none";
		
		// Declare flat canvas logic
		this.canvas = document.createElement("canvas");
		this.ctx = this.canvas.getContext("2d");
		this.canvas.style.pointerEvents = "auto";
		this.canvas.style.position = "absolute";
		this.canvas.style.transform = "translate(-50%, -50%)"; // Center over the 0x0 anchor
		
		this.dom_wrapper.appendChild(this.canvas);
		
		this.base_point_radius = 6;
		this.base_hitbox_radius = 20;
		this.grid_resolution = 20;
		this.img_display_size = 400;
		this.img_center = this.img_display_size / 2;
		this.max_buffer_size = 4096;
		
		this.canvas_w = 0;
		this.canvas_h = 0;
		this.canvas_dpr = 1;
		
		this.image = undefined;
		this.initial_zoom = map.getZoom();
		this.geometry = undefined;
		this.mesh_points = [];
		this.mesh_triangles = [];
		this.screen_pts = [];
		this.selected_point_index = null;
		this._is_dragging = false;
		
		// Initialise mesh and bind events
		this.initMesh();
		this.bindEvents();
		
		// Add keyframe with default coords/symbol
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
		this.updateOwner();
	}
	
	bindEvents() {
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
		
		map.on("viewchange", () => {
			this.render();
		});
	}
	
	commitKeyframe(arg0_symbol_obj) {
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
	
	draw() {
		let derender_geometry = false;
		this.value = this.history.getKeyframe({ date: main.date, guaranteed_indexes: [1] }).value;
		this.value[1] = this.getSymbol(this.value[1]);
		
		if (!this.value || this._is_visible === false) derender_geometry = true;
		if (this.value && this.value[2]) {
			if (this.value[2].hidden) derender_geometry = true;
			if (this.value[2].max_zoom && map.getZoom() > this.value[2].max_zoom) derender_geometry = true;
			if (this.value[2].min_zoom && map.getZoom() < this.value[2].min_zoom) derender_geometry = true;
		}
		
		if (!derender_geometry) {
			try {
				if (!map || !map.isLoaded()) return;
				let coords_obj = this.value[0];
				let symbol_obj = this.value[1];
				
				this.initial_zoom = coords_obj.initial_zoom ?? this.initial_zoom;
				if (this.selected_point_index === null && coords_obj.mesh_points) {
					this.mesh_points = JSON.parse(JSON.stringify(coords_obj.mesh_points));
					this.updateTriangulation();
				}
				
				if (!this.geometry) {
					this.geometry = new maptalks.ui.UIMarker(coords_obj.center, {
						draggable: false, single: false, content: this.dom_wrapper,
						rotateWithMap: false, // Explicitly false! We natively map points to standard 2D flat screens!
						pitchWithMap: false
					});
					this.geometry.addTo(map);
				} else {
					this.geometry.setCoordinates(new maptalks.Coordinate(coords_obj.center));
				}
				
				if (this.geometry.getMap()) this.geometry.show();
				
				this.canvas.style.opacity = symbol_obj.opacity ?? 0.45;
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
				let extent_coords = Geospatiale.parseCoords(this.extent_area.value);
				if (extent_coords.length >= 2 && this.mesh_points.length >= 4) {
					let lng_values = extent_coords.map((c) => c[0]), lat_values = extent_coords.map((c) => c[1]);
					let min_lng = Math.min(...lng_values), max_lng = Math.max(...lng_values), min_lat = Math.min(...lat_values), max_lat = Math.max(...lat_values);
					let mesh_corners = [[min_lng, max_lat], [max_lng, max_lat], [max_lng, min_lat], [min_lng, min_lat]];
					mesh_corners.forEach((coord, i) => {
						let world_pos = this.getLngLatToWorld(coord[0], coord[1]);
						this.mesh_points[i].x = world_pos.x;
						this.mesh_points[i].y = world_pos.y;
					});
					this.commitKeyframe();
				}
			});
		}
		return {
			edit_image_ui: veInterface(
				{
					warp_mode_select: veSelect({ triangulation: { name: "Affine Triangles" }, tps: { name: "Thin Plate Spline" } }, { name: "Warp Mode", selected: this.value[1]?.warp_mode || "triangulation", onuserchange: (v) => this.commitKeyframe({ warp_mode: v }) }),
					points_label: veHTML("Control Points [Lng, Lat]"),
					points_area: veHTML(this.points_area),
					extent_label: veHTML("Canvas Extent [TL, BR]"),
					extent_area: veHTML(this.extent_area),
					opacity_slider: veRange(Math.returnSafeNumber(this.value[1]?.opacity, 0.45), { name: "Opacity", min: 0, max: 1, step: 0.01, onuserchange: (v) => { this.canvas.style.opacity = v; this.commitKeyframe({ opacity: v }); } }),
					url_input: veText(this.value[1]?.image_url || "", { name: "Image URL", onuserchange: (v) => this.commitKeyframe({ image_url: v }) }),
				},
				{ name: "Edit Image", open: true }
			),
		};
	}
	
	getEventWorldPos(e) {
		let rect = map.getContainer().getBoundingClientRect();
		let pt = new maptalks.Point(e.clientX - rect.left, e.clientY - rect.top);
		let coord = map.containerPointToCoordinate(pt);
		if (!coord) return null; // Edge case (user clicks up into the horizon sky block)
		return this.getLngLatToWorld(coord.x, coord.y);
	}
	
	getEventScreenPos(e) {
		let rect = map.getContainer().getBoundingClientRect();
		return { x: e.clientX - rect.left, y: e.clientY - rect.top };
	}
	
	getLngLatToWorld(lng, lat) {
		let projection = map.getProjection(), marker_coord = this.geometry.getCoordinates(), res = map.getResolution(this.initial_zoom);
		let center_auc = projection.project(marker_coord), target_auc = projection.project(new maptalks.Coordinate(lng, lat));
		return { x: (target_auc.x - center_auc.x) / res + this.img_center, y: this.img_center - (target_auc.y - center_auc.y) / res };
	}
	
	getWorldToLngLat(wx, wy) {
		let projection = map.getProjection(), marker_coord = this.geometry.getCoordinates(), res = map.getResolution(this.initial_zoom);
		let center_auc = projection.project(marker_coord);
		let target_auc = new maptalks.Coordinate(center_auc.x + (wx - this.img_center) * res, center_auc.y - (wy - this.img_center) * res);
		let coordinate_result = projection.unproject(target_auc);
		return [coordinate_result.x, coordinate_result.y];
	}
	
	handleDoubleClick(e) {
		if (!this.selected) return;
		
		let mouse_sp = this.getEventScreenPos(e);
		let point_idx = null;
		let min_dist = this.base_hitbox_radius;
		
		// Intersect precisely with 2D projected screen pixel space
		if (this.screen_pts) {
			this.screen_pts.forEach((p, i) => {
				let dist = Math.hypot(p.screen_x - mouse_sp.x, p.screen_y - mouse_sp.y);
				if (dist < min_dist) {
					min_dist = dist;
					point_idx = i;
				}
			});
		}
		
		if (point_idx !== null) {
			this.mesh_points.splice(point_idx, 1);
			this.updateTriangulation();
			this.commitKeyframe();
			this.render();
		}
	}
	
	handleMouseDown(e) {
		if (!this.selected || e.button === 1) return;
		
		let mouse_sp = this.getEventScreenPos(e);
		
		this.selected_point_index = null;
		let min_dist = this.base_hitbox_radius;
		
		if (this.screen_pts) {
			this.screen_pts.forEach((p, i) => {
				let dist = Math.hypot(p.screen_x - mouse_sp.x, p.screen_y - mouse_sp.y);
				if (dist < min_dist) {
					min_dist = dist;
					this.selected_point_index = i;
				}
			});
		}
		
		this._is_dragging = false;
		
		if (this.selected_point_index === null) {
			let world_pos = this.getEventWorldPos(e);
			if (!world_pos) return;
			
			let source_x = world_pos.x, source_y = world_pos.y;
			for (let i = 0; i < this.mesh_triangles.length; i += 3) {
				let pt1 = this.mesh_points[this.mesh_triangles[i]], pt2 = this.mesh_points[this.mesh_triangles[i + 1]], pt3 = this.mesh_points[this.mesh_triangles[i + 2]];
				let bary_info = Geospatiale.getBarycentric(world_pos, pt1, pt2, pt3);
				if (bary_info.inside) {
					source_x = bary_info.u * pt1.src_x + bary_info.v * pt2.src_x + bary_info.w * pt3.src_x;
					source_y = bary_info.u * pt1.src_y + bary_info.v * pt2.src_y + bary_info.w * pt3.src_y;
					break;
				}
			}
			this.mesh_points.push({ x: world_pos.x, y: world_pos.y, src_x: source_x, src_y: source_y });
			this.selected_point_index = this.mesh_points.length - 1;
			this.updateTriangulation();
			this.render();
			this.commitKeyframe();
		}
	}
	
	handleMouseMove(e) {
		if (!this.selected || this.selected_point_index === null) return;
		this._is_dragging = true;
		
		let world_pos = this.getEventWorldPos(e);
		if (!world_pos) return;
		
		this.mesh_points[this.selected_point_index].x = world_pos.x;
		this.mesh_points[this.selected_point_index].y = world_pos.y;
		this.render();
	}
	
	initMesh() {
		this.mesh_points = [{ x: 0, y: 0, src_x: 0, src_y: 0 }, { x: this.img_display_size, y: 0, src_x: this.img_display_size, src_y: 0 }, { x: this.img_display_size, y: this.img_display_size, src_x: this.img_display_size, src_y: this.img_display_size }, { x: 0, y: this.img_display_size, src_x: 0, src_y: this.img_display_size }];
		this.updateTriangulation();
	}
	
	loadImage(arg0_url) {
		let url = arg0_url || "", map_defines = config.defines.map;
		this.image = new Image();
		this.image.onerror = () => console.error("Image failed to load:", this.image.src);
		this.image.onload = () => this.render();
		let pattern_check = /\.(jpeg|jpg|gif|png|webp|svg|bmp)$|^data:image/i;
		this.image.src = url && pattern_check.test(url) ? url : map_defines.default_image_src;
	}
	
	remove(arg0_do_not_refresh) {
		if (this.geometry) this.geometry.remove();
		super.remove(arg0_do_not_refresh);
	}
	
	render() {
		if (!this.image || !this.image.complete || this.image.naturalWidth === 0) return;
		if (!map || !map.isLoaded() || !this.geometry) return;
		
		this.updateBufferSize();
		if (!this.screen_pts) return;
		
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.save();
		
		// Scale purely to match retinal devices for crisp canvas vectors (keeps logical X/Y maths intact)
		this.ctx.scale(this.canvas_dpr, this.canvas_dpr);
		
		let warp_mode = this.value[1]?.warp_mode || "triangulation";
		
		// Calculate final flat physical canvas drawing points
		let canvas_pts = this.screen_pts.map(p => {
			return {
				x: this.canvas_w / 2 + p.rel_x,
				y: this.canvas_h / 2 + p.rel_y,
				src_x: p.src_x,
				src_y: p.src_y
			};
		});
		
		if (warp_mode === "tps" && canvas_pts.length >= 3) {
			let coeffs = Geospatiale.computeTPSCoefficients(canvas_pts);
			Geospatiale.renderTPSGrid(this.ctx, this.image, this.img_display_size, this.grid_resolution, canvas_pts, coeffs.x, coeffs.y);
		} else {
			for (let i = 0; i < this.mesh_triangles.length; i += 3) {
				let p1 = canvas_pts[this.mesh_triangles[i]], p2 = canvas_pts[this.mesh_triangles[i + 1]], p3 = canvas_pts[this.mesh_triangles[i + 2]];
				Geospatiale.drawTriangle(this.ctx, this.image, this.img_display_size, { x: p1.src_x, y: p1.src_y }, { x: p2.src_x, y: p2.src_y }, { x: p3.src_x, y: p3.src_y }, p1, p2, p3);
			}
		}
		
		if (this.selected) {
			Geospatiale.drawMeshOverlay(this.ctx, canvas_pts, this.mesh_triangles, 1, this.base_point_radius, this.selected_point_index);
		}
		
		this.ctx.restore();
		this.updateInfoPanels();
	}
	
	updateBufferSize() {
		let marker_coord = this.geometry.getCoordinates();
		let marker_screen = map.coordinateToContainerPoint(marker_coord);
		if (!marker_screen) return;
		
		let max_abs_x = 0, max_abs_y = 0;
		this.screen_pts = [];
		
		for (let p of this.mesh_points) {
			let lngLat = this.getWorldToLngLat(p.x, p.y);
			let sp = map.coordinateToContainerPoint(new maptalks.Coordinate(lngLat[0], lngLat[1]));
			
			// Protect against math singularities if points swing wildly behind the user's camera (negative Z)
			if (!sp || isNaN(sp.x) || isNaN(sp.y)) sp = { x: marker_screen.x, y: marker_screen.y };
			
			let rel_x = sp.x - marker_screen.x;
			let rel_y = sp.y - marker_screen.y;
			
			// Clip extremities for stability
			if (rel_x > 15000) rel_x = 15000; if (rel_x < -15000) rel_x = -15000;
			if (rel_y > 15000) rel_y = 15000; if (rel_y < -15000) rel_y = -15000;
			
			if (Math.abs(rel_x) > max_abs_x) max_abs_x = Math.abs(rel_x);
			if (Math.abs(rel_y) > max_abs_y) max_abs_y = Math.abs(rel_y);
			
			this.screen_pts.push({ ...p, screen_x: sp.x, screen_y: sp.y, rel_x: rel_x, rel_y: rel_y });
		}
		
		let dpr = window.devicePixelRatio || 1;
		let padding = 100;
		let target_w = Math.ceil(max_abs_x * 2 + padding);
		let target_h = Math.ceil(max_abs_y * 2 + padding);
		
		if (target_w > this.max_buffer_size) target_w = this.max_buffer_size;
		if (target_h > this.max_buffer_size) target_h = this.max_buffer_size;
		
		// Push only logical sizes to CSS, keep pixel multiplier in canvas
		if (this.canvas.style.width !== target_w + "px" || this.canvas.style.height !== target_h + "px") {
			this.canvas.style.width = target_w + "px";
			this.canvas.style.height = target_h + "px";
			this.canvas.width = target_w * dpr;
			this.canvas.height = target_h * dpr;
		}
		
		this.canvas_w = target_w;
		this.canvas_h = target_h;
		this.canvas_dpr = dpr;
	}
	
	updateInfoPanels() {
		if (!this.points_area || document.activeElement === this.points_area || document.activeElement === this.extent_area) return;
		this.points_area.value = this.mesh_points.map((p) => { let c = this.getWorldToLngLat(p.x, p.y); return "[" + c[0].toFixed(6) + ", " + c[1].toFixed(6) + "]"; }).join("\n");
		if (this.mesh_points.length > 0) {
			let min_x = Infinity, min_y = Infinity, max_x = -Infinity, max_y = -Infinity;
			for (let i = 0; i < this.mesh_points.length; i++) {
				let p = this.mesh_points[i];
				if (p.x < min_x) min_x = p.x; if (p.y < min_y) min_y = p.y;
				if (p.x > max_x) max_x = p.x; if (p.y > max_y) max_y = p.y;
			}
			let tl = this.getWorldToLngLat(min_x, min_y), br = this.getWorldToLngLat(max_x, max_y);
			this.extent_area.value = `[${tl[0].toFixed(6)}, ${tl[1].toFixed(6)}]\n[${br[0].toFixed(6)}, ${br[1].toFixed(6)}]`;
		}
	}
	
	updateTriangulation() {
		if (this.mesh_points.length < 3) { this.mesh_triangles = []; return; }
		this.mesh_triangles = Geospatiale.delaunayTriangulate(this.mesh_points, this.img_center);
	}
};