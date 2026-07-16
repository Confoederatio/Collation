naissance.GeometryImage = class extends naissance.Geometry {
	static hierarchy_symbol = {
		icon: "image",
		name: "Image",
	};
	
	constructor() {
		super();
		this.class_name = "GeometryImage";
		this.node_editor_mode = "Image";
		
		// UIMarker acts purely as a 0x0 coordinate anchor for keyframes.
		this.dom_wrapper = document.createElement("div");
		this.dom_wrapper.style.pointerEvents = "none";
		this.dom_wrapper.style.width = "0px";
		this.dom_wrapper.style.height = "0px";
		this.dom_wrapper.style.overflow = "visible";
		
		// Full-viewport screen-space canvas attached directly to the map container.
		this.canvas = document.createElement("canvas");
		this.ctx = this.canvas.getContext("2d");
		this.canvas.style.pointerEvents = "none";
		this.canvas.style.position = "absolute";
		this.canvas.style.top = "0";
		this.canvas.style.left = "0";
		this.canvas.style.zIndex = "1";
		
		map.getContainer().appendChild(this.canvas);
		
		this.base_point_radius = 6;
		this.base_hitbox_radius = 20;
		this.grid_resolution = 20;
		this.img_display_size = 400;
		this.img_center = this.img_display_size / 2;
		this.max_buffer_size = 4096;
		this.hit_area_padding = 50;
		
		// [FIX] Perspective is nonlinear; affine triangles between distant vertices
		// over/undershoot the projection (error flips sign with bearing). Each user
		// triangle is subdivided so sub-triangle edges stay below this many screen
		// pixels, making the piecewise-affine approximation of perspective accurate.
		this.max_edge_screen_px = 48;
		this.max_subdivision = 16;
		
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
		this._canvas_hidden = false;
		
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
		this._on_mousedown = (e) => this.handleMouseDown(e);
		this._on_mousemove = (e) => this.handleMouseMove(e);
		this._on_mouseup = (e) => this.handleMouseUp(e);
		this._on_dblclick = (e) => this.handleDoubleClick(e);
		
		let container = map.getContainer();
		container.addEventListener("mousedown", this._on_mousedown, true);
		container.addEventListener("mousemove", this._on_mousemove, true);
		container.addEventListener("mouseup", this._on_mouseup, true);
		container.addEventListener("dblclick", this._on_dblclick, true);
		
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
		this.value = this.history.getKeyframe({
			date: main.date,
			guaranteed_indexes: [1],
		}).value;
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
						draggable: false,
						single: false,
						content: this.dom_wrapper,
						rotateWithMap: false,
						pitchWithMap: false,
					});
					this.geometry.addTo(map);
				} else {
					this.geometry.setCoordinates(new maptalks.Coordinate(coords_obj.center));
				}
				
				if (this.geometry.getMap()) this.geometry.show();
				
				this.canvas.style.display = "";
				this._canvas_hidden = false;
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
			this.canvas.style.display = "none";
			this._canvas_hidden = true;
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
				let extent_coords = Geospatiale.parseCoords(this.extent_area.value);
				if (extent_coords.length >= 2 && this.mesh_points.length >= 4) {
					let lng_values = extent_coords.map((c) => c[0]),
						lat_values = extent_coords.map((c) => c[1]);
					let min_lng = Math.min(...lng_values),
						max_lng = Math.max(...lng_values),
						min_lat = Math.min(...lat_values),
						max_lat = Math.max(...lat_values);
					let mesh_corners = [
						[min_lng, max_lat],
						[max_lng, max_lat],
						[max_lng, min_lat],
						[min_lng, min_lat],
					];
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
					warp_mode_select: veSelect(
						{
							triangulation: { name: "Affine Triangles" },
							tps: { name: "Thin Plate Spline" },
						},
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
	
	getEventWorldPos(e) {
		let rect = map.getContainer().getBoundingClientRect();
		let pt = new maptalks.Point(e.clientX - rect.left, e.clientY - rect.top);
		let coord = map.containerPointToCoordinate(pt);
		if (!coord) return null;
		return this.getLngLatToWorld(coord.x, coord.y);
	}
	
	getEventScreenPos(e) {
		let rect = map.getContainer().getBoundingClientRect();
		return { x: e.clientX - rect.left, y: e.clientY - rect.top };
	}
	
	getHitPointIndex(mouse_sp) {
		if (!this.screen_pts) return null;
		return Geospatiale.getPointIndexAt(mouse_sp.x, mouse_sp.y, this.screen_pts.map(p => ({ x: p.screen_x, y: p.screen_y })), 1, this.base_hitbox_radius);
	}
	
	getLngLatToWorld(lng, lat) {
		let projection = map.getProjection(),
			marker_coord = this.geometry.getCoordinates(),
			res = map.getResolution(this.initial_zoom);
		let center_auc = projection.project(marker_coord),
			target_auc = projection.project(new maptalks.Coordinate(lng, lat));
		return {
			x: (target_auc.x - center_auc.x) / res + this.img_center,
			y: this.img_center - (target_auc.y - center_auc.y) / res,
		};
	}
	
	getWorldToLngLat(wx, wy) {
		let projection = map.getProjection(),
			marker_coord = this.geometry.getCoordinates(),
			res = map.getResolution(this.initial_zoom);
		let center_auc = projection.project(marker_coord);
		let target_auc = new maptalks.Coordinate(
			center_auc.x + (wx - this.img_center) * res,
			center_auc.y - (wy - this.img_center) * res
		);
		let coordinate_result = projection.unproject(target_auc);
		return [coordinate_result.x, coordinate_result.y];
	}
	
	getWorldToScreen(wx, wy, fallback_sp) {
		let lngLat = this.getWorldToLngLat(wx, wy);
		let sp = map.coordinateToContainerPoint(new maptalks.Coordinate(lngLat[0], lngLat[1]));
		
		if (!sp || isNaN(sp.x) || isNaN(sp.y)) sp = fallback_sp || { x: 0, y: 0 };
		
		let sx = sp.x,
			sy = sp.y;
		if (sx > 20000) sx = 20000;
		if (sx < -20000) sx = -20000;
		if (sy > 20000) sy = 20000;
		if (sy < -20000) sy = -20000;
		return { x: sx, y: sy };
	}
	
	handleDoubleClick(e) {
		if (!this.selected || this._canvas_hidden) return;
		
		let mouse_sp = this.getEventScreenPos(e);
		let point_idx = this.getHitPointIndex(mouse_sp);
		
		if (point_idx !== null) {
			e.stopPropagation();
			e.preventDefault();
			this.mesh_points.splice(point_idx, 1);
			this.updateTriangulation();
			this.commitKeyframe();
			this.render();
		}
	}
	
	handleMouseDown(e) {
		if (!this.selected || this._canvas_hidden || e.button === 1) return;
		
		let mouse_sp = this.getEventScreenPos(e);
		this.selected_point_index = this.getHitPointIndex(mouse_sp);
		this._is_dragging = false;
		
		if (this.selected_point_index === null) {
			if (!this.isInsideImageArea(mouse_sp)) return;
			
			let world_pos = this.getEventWorldPos(e);
			if (!world_pos) return;
			
			e.stopPropagation();
			e.preventDefault();
			
			let source_x = world_pos.x,
				source_y = world_pos.y;
			for (let i = 0; i < this.mesh_triangles.length; i += 3) {
				let pt1 = this.mesh_points[this.mesh_triangles[i]],
					pt2 = this.mesh_points[this.mesh_triangles[i + 1]],
					pt3 = this.mesh_points[this.mesh_triangles[i + 2]];
				let bary_info = Geospatiale.getBarycentric(world_pos, pt1, pt2, pt3);
				if (bary_info.inside) {
					source_x = bary_info.u * pt1.src_x + bary_info.v * pt2.src_x + bary_info.w * pt3.src_x;
					source_y = bary_info.u * pt1.src_y + bary_info.v * pt2.src_y + bary_info.w * pt3.src_y;
					break;
				}
			}
			this.mesh_points.push({
				x: world_pos.x,
				y: world_pos.y,
				src_x: source_x,
				src_y: source_y,
			});
			this.selected_point_index = this.mesh_points.length - 1;
			this.updateTriangulation();
			this.render();
			this.commitKeyframe();
		} else {
			e.stopPropagation();
			e.preventDefault();
		}
	}
	
	handleMouseMove(e) {
		if (!this.selected || this.selected_point_index === null) return;
		this._is_dragging = true;
		
		e.stopPropagation();
		e.preventDefault();
		
		let world_pos = this.getEventWorldPos(e);
		if (!world_pos) return;
		
		this.mesh_points[this.selected_point_index].x = world_pos.x;
		this.mesh_points[this.selected_point_index].y = world_pos.y;
		this.render();
	}
	
	handleMouseUp(e) {
		if (this.selected_point_index !== null) {
			e.stopPropagation();
			this.selected_point_index = null;
			if (this._is_dragging) {
				this._is_dragging = false;
				this.commitKeyframe();
			}
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
	
	isInsideImageArea(mouse_sp) {
		if (!this.screen_pts || this.screen_pts.length === 0) return false;
		let min_x = Infinity,
			min_y = Infinity,
			max_x = -Infinity,
			max_y = -Infinity;
		for (let p of this.screen_pts) {
			if (p.screen_x < min_x) min_x = p.screen_x;
			if (p.screen_y < min_y) min_y = p.screen_y;
			if (p.screen_x > max_x) max_x = p.screen_x;
			if (p.screen_y > max_y) max_y = p.screen_y;
		}
		return (
			mouse_sp.x >= min_x - this.hit_area_padding &&
			mouse_sp.x <= max_x + this.hit_area_padding &&
			mouse_sp.y >= min_y - this.hit_area_padding &&
			mouse_sp.y <= max_y + this.hit_area_padding
		);
	}
	
	loadImage(arg0_url) {
		let url = arg0_url || "",
			map_defines = config.defines.map;
		this.image = new Image();
		this.image.onerror = () => console.error("Image failed to load:", url);
		this.image.onload = () => this.render();
		let pattern_check = /\.(jpeg|jpg|gif|png|webp|svg|bmp)$|^data:image/i;
		this.image.src = url && pattern_check.test(url) ? url : map_defines.default_image_src;
	}
	
	remove(arg0_do_not_refresh) {
		if (this.geometry) this.geometry.remove();
		
		if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
		let container = map.getContainer();
		if (container) {
			container.removeEventListener("mousedown", this._on_mousedown, true);
			container.removeEventListener("mousemove", this._on_mousemove, true);
			container.removeEventListener("mouseup", this._on_mouseup, true);
			container.removeEventListener("dblclick", this._on_dblclick, true);
		}
		
		super.remove(arg0_do_not_refresh);
	}
	
	render() {
		if (!this.image || !this.image.complete || this.image.naturalWidth === 0) return;
		if (!map || !map.isLoaded() || !this.geometry || this._canvas_hidden) return;
		
		this.updateBufferSize();
		if (!this.screen_pts) return;
		
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.save();
		this.ctx.scale(this.canvas_dpr, this.canvas_dpr);
		
		let warp_mode = this.value[1]?.warp_mode || "triangulation";
		
		if (warp_mode === "tps" && this.mesh_points.length >= 3) {
			this.renderTPSSubdivided();
		} else {
			for (let i = 0; i < this.mesh_triangles.length; i += 3) {
				let a = this.screen_pts[this.mesh_triangles[i]];
				let b = this.screen_pts[this.mesh_triangles[i + 1]];
				let c = this.screen_pts[this.mesh_triangles[i + 2]];
				this.renderTriangleSubdivided(a, b, c);
			}
		}
		
		if (this.selected) {
			let overlay_pts = this.screen_pts.map((p) => ({
				x: p.screen_x,
				y: p.screen_y,
				src_x: p.src_x,
				src_y: p.src_y,
			}));
			Geospatiale.drawMeshOverlay(this.ctx, overlay_pts, this.mesh_triangles, 1, this.base_point_radius, this.selected_point_index);
		}
		
		this.ctx.restore();
		this.updateInfoPanels();
	}
	
	renderTriangleSubdivided(a, b, c) {
		let edge_px = Math.max(
			Math.hypot(a.screen_x - b.screen_x, a.screen_y - b.screen_y),
			Math.hypot(b.screen_x - c.screen_x, b.screen_y - c.screen_y),
			Math.hypot(c.screen_x - a.screen_x, c.screen_y - a.screen_y)
		);
		let n = Math.ceil(edge_px / this.max_edge_screen_px);
		if (n < 1) n = 1;
		if (n > this.max_subdivision) n = this.max_subdivision;
		
		let verts = [];
		let fallback = { x: a.screen_x, y: a.screen_y };
		for (let i = 0; i <= n; i++) {
			for (let j = 0; j <= n - i; j++) {
				let u = i / n,
					v = j / n,
					w = 1 - u - v;
				let wx = u * a.x + v * b.x + w * c.x;
				let wy = u * a.y + v * b.y + w * c.y;
				let sx_src = u * a.src_x + v * b.src_x + w * c.src_x;
				let sy_src = u * a.src_y + v * b.src_y + w * c.src_y;
				let sp =
					n === 1
						? i === 1
							? { x: a.screen_x, y: a.screen_y }
							: j === 1
								? { x: b.screen_x, y: b.screen_y }
								: { x: c.screen_x, y: c.screen_y }
						: this.getWorldToScreen(wx, wy, fallback);
				verts.push({ x: sp.x, y: sp.y, src_x: sx_src, src_y: sy_src });
			}
		}
		
		let row_start = (i) => (i * (2 * n - i + 3)) / 2;
		
		for (let i = 0; i < n; i++) {
			for (let j = 0; j < n - i; j++) {
				let v00 = verts[row_start(i) + j];
				let v01 = verts[row_start(i) + j + 1];
				let v10 = verts[row_start(i + 1) + j];
				Geospatiale.drawTriangle(
					this.ctx,
					this.image,
					this.img_display_size,
					{ x: v00.src_x, y: v00.src_y },
					{ x: v01.src_x, y: v01.src_y },
					{ x: v10.src_x, y: v10.src_y },
					v00,
					v01,
					v10
				);
				if (j < n - i - 1) {
					let v11 = verts[row_start(i + 1) + j + 1];
					Geospatiale.drawTriangle(
						this.ctx,
						this.image,
						this.img_display_size,
						{ x: v01.src_x, y: v01.src_y },
						{ x: v11.src_x, y: v11.src_y },
						{ x: v10.src_x, y: v10.src_y },
						v01,
						v11,
						v10
					);
				}
			}
		}
	}
	
	renderTPSSubdivided() {
		let world_pts = this.mesh_points.map((p) => ({
			x: p.x,
			y: p.y,
			src_x: p.src_x,
			src_y: p.src_y,
		}));
		let coeffs = Geospatiale.computeTPSCoefficients(world_pts);
		let res = this.grid_resolution;
		let step = this.img_display_size / res;
		let fallback = this.screen_pts.length ? { x: this.screen_pts[0].screen_x, y: this.screen_pts[0].screen_y } : { x: 0, y: 0 };
		
		let grid = [];
		for (let gy = 0; gy <= res; gy++) {
			let row = [];
			for (let gx = 0; gx <= res; gx++) {
				let sx = gx * step,
					sy = gy * step;
				let pos = Geospatiale.getTPSPosition(sx, sy, world_pts, coeffs.x, coeffs.y);
				let sp = this.getWorldToScreen(pos.x, pos.y, fallback);
				row.push({ x: sp.x, y: sp.y, src_x: sx, src_y: sy });
			}
			grid.push(row);
		}
		
		for (let gy = 0; gy < res; gy++) {
			for (let gx = 0; gx < res; gx++) {
				let v00 = grid[gy][gx],
					v01 = grid[gy][gx + 1],
					v10 = grid[gy + 1][gx],
					v11 = grid[gy + 1][gx + 1];
				Geospatiale.drawTriangle(
					this.ctx,
					this.image,
					this.img_display_size,
					{ x: v00.src_x, y: v00.src_y },
					{ x: v01.src_x, y: v01.src_y },
					{ x: v10.src_x, y: v10.src_y },
					v00,
					v01,
					v10
				);
				Geospatiale.drawTriangle(
					this.ctx,
					this.image,
					this.img_display_size,
					{ x: v01.src_x, y: v01.src_y },
					{ x: v11.src_x, y: v11.src_y },
					{ x: v10.src_x, y: v10.src_y },
					v01,
					v11,
					v10
				);
			}
		}
	}
	
	updateBufferSize() {
		let map_size = map.getSize();
		if (!map_size) return;
		
		this.screen_pts = [];
		let fallback = { x: map_size.width / 2, y: map_size.height / 2 };
		
		for (let p of this.mesh_points) {
			let sp = this.getWorldToScreen(p.x, p.y, fallback);
			this.screen_pts.push({ ...p, screen_x: sp.x, screen_y: sp.y });
		}
		
		let dpr = window.devicePixelRatio || 1;
		let target_w = Math.ceil(map_size.width);
		let target_h = Math.ceil(map_size.height);
		
		if (target_w * dpr > this.max_buffer_size) target_w = Math.floor(this.max_buffer_size / dpr);
		if (target_h * dpr > this.max_buffer_size) target_h = Math.floor(this.max_buffer_size / dpr);
		
		if (
			this.canvas.style.width !== target_w + "px" ||
			this.canvas.style.height !== target_h + "px" ||
			this.canvas_dpr !== dpr
		) {
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
		this.points_area.value = this.mesh_points
		.map((p) => {
			let c = this.getWorldToLngLat(p.x, p.y);
			return "[" + c[0].toFixed(6) + ", " + c[1].toFixed(6) + "]";
		})
		.join("\n");
		if (this.mesh_points.length > 0) {
			let min_x = Infinity,
				min_y = Infinity,
				max_x = -Infinity,
				max_y = -Infinity;
			for (let i = 0; i < this.mesh_points.length; i++) {
				let p = this.mesh_points[i];
				if (p.x < min_x) min_x = p.x;
				if (p.y < min_y) min_y = p.y;
				if (p.x > max_x) max_x = p.x;
				if (p.y > max_y) max_y = p.y;
			}
			let tl = this.getWorldToLngLat(min_x, min_y),
				br = this.getWorldToLngLat(max_x, max_y);
			this.extent_area.value = `[${tl[0].toFixed(6)}, ${tl[1].toFixed(6)}]\n[${br[0].toFixed(6)}, ${br[1].toFixed(6)}]`;
		}
	}
	
	updateTriangulation() {
		if (this.mesh_points.length < 3) {
			this.mesh_triangles = [];
			return;
		}
		this.mesh_triangles = Geospatiale.delaunayTriangulate(this.mesh_points, this.img_center);
	}
};