//Import libraries
let { app, BrowserWindow, dialog, ipcMain, Menu, session, shell } = require("electron");
let fs = require("fs");
let path = require("path");
let readline = require("readline");
let { performance } = require("perf_hooks");

//Metadata - Title
let latest_fps = 0;
let naissance_version = "1.8b Guinea";
let title_update_interval;
let win;

//Initialise functions
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
    const baseDataPath = path.join(app.getPath('appData'), "naissance");
    const currentPid = process.pid;
    
    // 1. Ensure the base directory exists
    if (!fs.existsSync(baseDataPath)) {
      fs.mkdirSync(baseDataPath, { recursive: true });
    }
    
    // 2. Clean up old folders
    const files = fs.readdirSync(baseDataPath);
    files.forEach((file) => {
      if (file.startsWith('instance-')) {
        const folderPath = path.join(baseDataPath, file);
        const folderPid = parseInt(file.replace('instance-', ''), 10);
        
        try {
          // process.kill(pid, 0) throws an error if the process does not exist.
          // It doesn't actually kill the process.
          process.kill(folderPid, 0);
          // If no error, the process is still running. Leave it alone.
        } catch (e) {
          // Process is dead, attempt to delete the folder
          try {
            fs.rmSync(folderPath, { recursive: true, force: true });
            console.log(`Cleaned up orphaned folder: ${file}`);
          } catch (err) {
            // Folder might be locked by a closing process, skip it for now
          }
        }
      }
    });
    
    // 3. Set the path for the current instance
    const newPath = path.join(baseDataPath, `instance-${currentPid}`);
    app.setPath('userData', newPath);
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
}