library(shiny)
library(terra)
library(tidyterra)
library(png)
library(ggplot2)
library(viridis)
library(dplyr)
library(sf)
library(scales)
library(rnaturalearth)

options(shiny.maxRequestSize = 50 * 1024^2)

decodeGeoPng = function(png_path, format_str) {
  let_img_data = readPNG(png_path)
  let_img_dims = dim(let_img_data)
  
  let_r_chan = floor(let_img_data[,,1] * 255)
  let_g_chan = floor(let_img_data[,,2] * 255)
  let_b_chan = floor(let_img_data[,,3] * 255)
  let_a_chan = floor(let_img_data[,,4] * 255)
  
  if (format_str == "int32") {
    let_decoded_numeric = as.numeric(let_r_chan) * 16777216 + as.numeric(let_g_chan) * 65536 + as.numeric(let_b_chan) * 256 + as.numeric(let_a_chan)
    return(matrix(let_decoded_numeric, nrow = let_img_dims[1], ncol = let_img_dims[2]))
  } else if (format_str == "float32") {
    let_raw_vector = as.raw(as.vector(aperm(let_img_data, c(3, 2, 1))) * 255)
    let_decoded_float = readBin(let_raw_vector, "double", n = let_img_dims[1] * let_img_dims[2], size = 4, endian = "big")
    let_decoded_float[is.nan(let_decoded_float)] = 0
    return(matrix(let_decoded_float, nrow = let_img_dims[1], ncol = let_img_dims[2], byrow = TRUE))
  }
  return(NULL)
}

ui = fluidPage(
  tags$head(
    tags$style(
      "
      #click_info_panel {
        background-color: rgba(255, 255, 255, 0.85);
        border: 2px solid #000;
        padding-left: 4px;
        pointer-events: none;
        z-index: 999;
        font-family: monospace;
      }
      "
    )
  ),
  titlePanel("GeoPNG Viewer"),
  sidebarLayout(
    sidebarPanel(
      fileInput("geo_file", "Select GeoPNG File", accept = c(".png")),
      selectInput("data_format", "Encoding Format", choices = c("int32", "float32"), selected = "float32"),
      selectInput("projection", "Spatial Projection", 
                  choices = c("Equirectangular", "Mercator", "Equal Earth"), selected = "Equal Earth"),
      selectInput("scale_type", "Scale Transformation", 
                  choices = c("linear", "pseudo-log"), selected = "pseudo-log"),
      numericInput("log_sigma", "Pseudo-log Sigma (Steepness)", value = 1, min = 0.001, step = 0.5),
      selectInput("color_palette", "Color Palette", 
                  choices = c("Plasma", "Viridis", "Magma", "Inferno", "Cividis", "Turbo", "Spectral", "Heat")),
      hr(),
      h4("Visual Bounds"),
      numericInput("min_val", "Min Value Override", value = NA),
      numericInput("max_val", "Max Value Override", value = NA),
      hr(),
      selectInput("downsample_method", "Downsampling Method", choices = c("maximum", "minimum", "average", "near"), selected = "maximum"),
      checkboxInput("use_filename_title", "Use Filename as Title", value = TRUE),
      textInput("plot_title", "Manual Title", value = "Raster Map"),
      textInput("plot_subtitle", "Subtitle", value = "Downsampled to 1M cells"),
      textInput("legend_title", "Legend Label", value = "Value"),
      helpText("Zoom: Click-drag to brush area."),
      helpText("Reset: Double-click map."),
      helpText("Inspect: Click map for coordinates.")
    ),
    mainPanel(
      div(
        style = "position: relative;",
        plotOutput(
          "geo_plot", 
          height = "850px", 
          click = "plot_click",
          dblclick = "plot_reset",
          brush = brushOpts(id = "plot_brush", resetOnNew = TRUE)
        ),
        uiOutput("click_info_panel")
      )
    )
  )
)

server = function(input, output, session) {
  
  let_zoom_coords = reactiveValues(x = NULL, y = NULL)
  
  observeEvent(input$plot_brush, {
    let_brush = input$plot_brush
    let_x_range = abs(let_brush$xmax - let_brush$xmin)
    let_y_range = abs(let_brush$ymax - let_brush$ymin)
    
    if (let_x_range > 0.001 && let_y_range > 0.001) {
      let_zoom_coords$x = c(let_brush$xmin, let_brush$xmax)
      let_zoom_coords$y = c(let_brush$ymin, let_brush$ymax)
    }
  })
  
  observeEvent(input$plot_reset, {
    let_zoom_coords$x = NULL
    let_zoom_coords$y = NULL
  })
  
  baseRaster = reactive({
    req(input$geo_file)
    let_mat = decodeGeoPng(input$geo_file$datapath, input$data_format)
    let_r = rast(let_mat, crs = "EPSG:4326", ext = ext(-180, 180, -90, 90))
    let_r[let_r == 0] = NA
    return(let_r)
  })
  
  projectedData = reactive({
    let_r = baseRaster()
    let_p_choice = input$projection
    
    let_crs = switch(let_p_choice,
                     "Equirectangular" = "EPSG:4326",
                     "Mercator" = "EPSG:3857",
                     "Equal Earth" = "+proj=eqearth +datum=WGS84 +wktext")
    
    if (let_p_choice == "Mercator") {
      let_r = crop(let_r, ext(-180, 180, -85.05113, 85.05113))
    }
    
    let_warped = project(let_r, let_crs, method = "near")
    
    let_world = ne_countries(scale = "medium", returnclass = "sf")
    let_world_p = st_transform(let_world, let_crs)
    
    let_g = st_graticule(lat = seq(-90, 90, 10), lon = seq(-180, 180, 20))
    let_g_p = st_transform(let_g, let_crs)
    
    if (let_p_choice == "Equal Earth") {
      let_clip = st_bbox(c(xmin = -17253333, xmax = 17253333, ymin = -9024409, ymax = 9024409), crs = st_crs(let_crs)) %>% st_as_sfc()
      let_world_p = st_intersection(st_make_valid(let_world_p), let_clip)
      let_g_p = st_intersection(let_g_p, let_clip)
    } else if (let_p_choice == "Mercator") {
      let_clip = st_bbox(c(xmin = -20037508, xmax = 20037508, ymin = -20037508, ymax = 20037508), crs = st_crs(let_crs)) %>% st_as_sfc()
      let_world_p = st_intersection(st_make_valid(let_world_p), let_clip)
      let_g_p = st_intersection(let_g_p, let_clip)
    }
    
    return(list(raster = let_warped, grat = let_g_p, land = let_world_p, crs = let_crs))
  })
  
  output$click_info_panel = renderUI({
    let_ev = input$plot_click
    req(let_ev)
    let_proj = projectedData()
    let_orig_r = baseRaster()
    
    let_v_pt = vect(cbind(let_ev$x, let_ev$y), crs = let_proj$crs)
    let_wgs_pt = project(let_v_pt, "EPSG:4326")
    let_wgs_c = crds(let_wgs_pt)
    
    let_val_raw = terra::extract(let_orig_r, let_wgs_pt)
    let_val = if (nrow(let_val_raw) > 0) let_val_raw[1, 2] else NA
    
    let_cell = cellFromXY(let_orig_r, let_wgs_c)
    let_px = rowColFromCell(let_orig_r, let_cell)
    
    absolutePanel(
      id = "click_info_panel",
      left = let_ev$coords_css$x + 15,
      top = let_ev$coords_css$y - 120,
      width = 280,
      div(
        h5(strong("X:"), paste0(let_px[1, 2], ", Y:", let_px[1, 1]), style = "font-weight: bold; margin-bottom: 4px; color: #007bff;"),
        div(strong("Value: "), ifelse(is.na(let_val), "NA", format(let_val, big.mark = ",", scientific = FALSE))),
        div(strong("Latlng: "), round(let_wgs_c[1, 2], 5), round(let_wgs_c[1, 1], 5))
      )
    )
  })
  
  output$geo_plot = renderPlot({
    let_p_obj = projectedData()
    let_r = let_p_obj$raster
    
    let_max_vis_cells = 1000000
    let_current_cells = ncell(let_r)
    
    if (let_current_cells > let_max_vis_cells) {
      if (input$downsample_method == "near") {
        let_r = spatSample(let_r, size = let_max_vis_cells, method = "regular", as.raster = TRUE)
      } else {
        let_agg_fact = ceiling(sqrt(let_current_cells / let_max_vis_cells))
        let_agg_fun = switch(
          input$downsample_method,
          "maximum" = "max",
          "minimum" = "min",
          "average" = "mean"
        )
        let_r = aggregate(let_r, fact = let_agg_fact, fun = let_agg_fun, na.rm = TRUE)
      }
    }
    
    let_vals = values(let_r, mat = FALSE)
    let_vals = let_vals[is.finite(let_vals)]
    
    if (is.na(input$min_val)) {
      let_min = min(let_vals, na.rm = TRUE)
    } else {
      let_min = input$min_val
    }
    
    if (is.na(input$max_val)) {
      let_max = max(let_vals, na.rm = TRUE)
    } else {
      let_max = input$max_val
    }
    
    if (input$scale_type == "pseudo-log") {
      let_trans = pseudo_log_trans(sigma = input$log_sigma)
    } else {
      let_trans = identity_trans()
    }
    
    let_brk_low = let_trans$transform(let_min)
    let_brk_high = let_trans$transform(let_max)
    let_brks = let_trans$inverse(seq(let_brk_low, let_brk_high, length.out = 8))
    
    if (input$use_filename_title && !is.null(input$geo_file)) {
      let_display_title = input$geo_file$name
    } else {
      let_display_title = input$plot_title
    }
    
    let_legend_label = paste0(input$legend_title, "\n[", tools::toTitleCase(input$downsample_method), "]")
    let_subtitle_label = paste0(input$plot_subtitle, " (", input$downsample_method, ")")
    
    let_gg = ggplot() +
      geom_sf(data = let_p_obj$land, fill = "#222222", color = NA) +
      geom_spatraster(data = let_r, maxcell = Inf) +
      geom_sf(data = let_p_obj$grat, color = "white", alpha = 0.2, linewidth = 0.3) +
      coord_sf(
        crs = let_p_obj$crs, 
        xlim = let_zoom_coords$x, 
        ylim = let_zoom_coords$y,
        expand = FALSE,
        datum = NA
      ) +
      labs(title = let_display_title, subtitle = let_subtitle_label, fill = let_legend_label) +
      theme_minimal() +
      theme(
        panel.background = element_rect(fill = "#eef2f5", color = NA),
        panel.grid = element_blank(),
        plot.title = element_text(size = 20, face = "bold"),
        legend.key.height = unit(3, "cm")
      )
    
    let_acc = 0.0001
    
    if (input$color_palette %in% c("Viridis", "Magma", "Inferno", "Plasma", "Cividis", "Turbo")) {
      let_opt = switch(input$color_palette, "Magma" = "A", "Inferno" = "B", "Plasma" = "C", "Viridis" = "D", "Cividis" = "E", "Turbo" = "H")
      let_gg = let_gg + scale_fill_viridis_c(
        option = let_opt, trans = let_trans, na.value = NA,
        limits = c(let_min, let_max), oob = squish, 
        labels = label_comma(accuracy = let_acc), breaks = let_brks,
        guide = guide_colorbar(frame.colour = "black", ticks.colour = "black")
      )
    } else {
      if (input$color_palette == "Spectral") {
        let_pal = "Spectral"
        let_dir = -1
      } else {
        let_pal = "YlOrRd"
        let_dir = 1
      }
      let_gg = let_gg + scale_fill_distiller(
        palette = let_pal, direction = let_dir,
        trans = let_trans, na.value = NA,
        limits = c(let_min, let_max), oob = squish, 
        labels = label_comma(accuracy = let_acc), breaks = let_brks,
        guide = guide_colorbar(frame.colour = "black", ticks.colour = "black")
      )
    }
    
    return(let_gg)
  })
}

shinyApp(ui = ui, server = server)