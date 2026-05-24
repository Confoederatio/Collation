//Import libraries
let { app, BrowserWindow, dialog, ipcMain, Menu, session, shell } = require("electron");
let fs = require("fs");
let path = require("path");
let readline = require("readline");
let { performance } = require("perf_hooks");
const ve = require("./UF/js/vercengen/engine/vercengen_electron");

//Metadata - Title
let latest_fps = 0;
let naissance_version = "1.81b Tehuantepec";
let title_update_interval;
let win;

//Initialise functions - Startup
{
  function createWindow () {
    //Declare local instance variables
    win = new BrowserWindow({
      width: 3840,
      height: 2160,
      webPreferences: {
        contextIsolation: false,
        enableRemoteModule: false,
        nodeIntegration: true,
        webSecurity: false
      },
      
      icon: path.join(process.cwd(), `gfx/logo.png`)
    });
    
    //Load file; open Inspect Element
    win.webContents.openDevTools();
    win.setMenuBarVisibility(false);
    win.loadFile("index.html");
    
    //Listen for FPS updates from the renderer process
    ipcMain.on("update-fps", (event, fps) => {
      latest_fps = fps;
    });
    
    //Update the title every second with the latest data
    title_update_interval = setInterval(function () {
      let memory_usage = process.memoryUsage();
      
      let heap_used_mb = (memory_usage.heapUsed/1024/1024).toFixed(2);
      let rss_mb = (memory_usage.rss/1024/1024).toFixed(2);
      let title_string = `Naissance World Model ${naissance_version} - FPS: ${latest_fps} | RAM: RSS ${rss_mb}MB/Heap ${heap_used_mb}MB`;
      
      win.setTitle(title_string);
    }, 1000);
    
    //<a href> handling
    //Intercept link clicks that would navigate the current window
    win.webContents.on("will-navigate", (event, url) => {
      if (url !== win.webContents.getURL()) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });
    
    //Intercept target="_blank" or window.open()
    win.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: "deny" };
    });
    
    //Get the default session
    try {
      let default_session = session.defaultSession;
      
      //Set up CORS settings for the default session
      default_session.webRequest.onHeadersReceived((details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Access-Control-Allow-Origin': ['*'],
            'Access-Control-Allow-Methods': ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
            'Access-Control-Allow-Headers': ['Content-Type', 'Authorization']
          }
        });
      });
    } catch (e) {
      console.warn(e);
    }
  }
  
  function initCache () {
    //Declare local instance variables
    let base_data_path = path.join(app.getPath('appData'), "naissance");
    let current_pid = process.pid;
    
    //1. Ensure the base directory exists
    if (!fs.existsSync(base_data_path))
      fs.mkdirSync(base_data_path, { recursive: true });
    
    //2. Clean up old folders
    let files = fs.readdirSync(base_data_path);
    files.forEach((file) => {
      if (file.startsWith('instance-')) {
        let folder_path = path.join(base_data_path, file);
        let folder_pid = parseInt(file.replace('instance-', ''), 10);
        
        try {
          //Throws an error if the process does not exist, doesn't actually kill the process.
          process.kill(folder_pid, 0);
        } catch (e) {
          //Process is dead, attempt to delete the folder
          try {
            fs.rmSync(folder_path, { recursive: true, force: true });
            console.log(`Cleaned up orphaned folder: ${file}`);
          } catch (e) {}
        }
      }
    });
    
    //3. Set the path for the current instance
    let new_path = path.join(base_data_path, `instance-${current_pid}`);
    app.setPath('userData', new_path);
  }
}

//App handling
{
  initCache();
  
  app.commandLine.appendSwitch("enable-features", "SharedArrayBuffer");
  app.commandLine.appendSwitch('js-flags', '--max-old-space-size=32128 --expose-gc');
  
  //Launch app when ready
  app.whenReady().then(() => {
    //Create the window and instantiate it
    createWindow();
    
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
    app.on("ready", () => {
      Menu.setApplicationMenu(null);
    });
  });
  
  //Window lifecycle defaults
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

//IPC handling
{
  let ve = require("./UF/js/vercengen/engine/vercengen_electron");
  ve.initialiseIPC();
  
  ve.NDJSON_load("./saves/atlas.naissance").then(() => {
    ve.NDJSON_diffAll("./saves/atlas.naissance.ndjson", { timestamp: 1005088321 })
    .then(async (v) => {
      for (let i = 0; i < v.length; i++) console.log(v[i].key, v[i].value);
      let local_value = await ve.NDJSON_getValue("./saves/atlas.naissance.ndjson", "45817001146");
      console.log("Local value:", local_value);
      
      console.time("set_value");
      await ve.NDJSON_setValue("./saves/atlas.naissance.ndjson", "45817001146", { key: "value", hello: "world" });
      local_value = await ve.NDJSON_getValue("./saves/atlas.naissance.ndjson", "45817001146");
      console.timeEnd("set_value");
      console.log("Local value after write:", local_value);
      
      console.time("read_value");
      let local_value_two = await ve.NDJSON_getValue("./saves/atlas.naissance.ndjson", "34593585401");
      console.log("Local value:", local_value_two);
      console.timeEnd("read_value");
      
      console.time("set_value_two");
      await ve.NDJSON_setValue("./saves/atlas.naissance.ndjson", "34593585401", { key: "value", hello: "world" });
      local_value_two = await ve.NDJSON_getValue("./saves/atlas.naissance.ndjson", "34593585401");
      console.timeEnd("set_value_two");
      console.log("Local value after write:", local_value_two);
      
      console.time("remove");
      await ve.NDJSON_removeValue("./saves/atlas.naissance.ndjson", "45817001146");
      local_value = await ve.NDJSON_getValue("./saves/atlas.naissance.ndjson", "45817001146");
      console.timeEnd("remove");
      console.log("Local value after remove:", local_value);
      
      console.time("query 1000 GeometryPolygons");
      local_value = await ve.NDJSON_query("./saves/atlas.naissance.ndjson", { class_name: "GeometryPolygon" }, { 
        limit_start: 1000,
        limit_end: 1500
      });
      console.timeEnd("query 1000 GeometryPolygons");
      console.log("1000 GeometryPolygons:", local_value.length);
      
      console.log("Active Workers:", ve.NDJSON_getWorkerPool().length);
      
      //await ve.NDJSON_save("./saves/atlas.naissance.ndjson");
    });
  });
}