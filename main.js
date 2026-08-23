//Import libraries
let { app, BrowserWindow, dialog, ipcMain, session, shell } = require("electron");
let discord = require("@xhayper/discord-rpc");
let fs = require("fs");
let path = require("path");
let readline = require("readline");
let remote_main = require("@electron/remote/main");
let { performance } = require("perf_hooks");

//Metadata - Social Media
let client_id = "1541118076932722698"; //Application ID for Naissance in Discord Developer Portal
let is_rpc_ready = false;
let rpc = new discord.Client({ clientId: client_id });

//Metadata - Title
let latest_fps = 0;
let naissance_version = "1.96b Lion";
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
        preload: path.join(__dirname, "core/preload.js"),
        
        contextIsolation: false,
        enableRemoteModule: false,
        nodeIntegration: true,
        webSecurity: false,
        webviewTag: true
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
      let is_destroyed = !win || win.isDestroyed();
      if (is_destroyed) {
        clearInterval(title_update_interval);
        return;
      }
      
      let memory_usage = process.memoryUsage();
      let heap_used_mb = (memory_usage.heapUsed/1024/1024).toFixed(2);
      let rss_mb = (memory_usage.rss/1024/1024).toFixed(2);
      let title_string = `Naissance World Model ${naissance_version} - FPS: ${latest_fps} | RAM: RSS ${rss_mb}MB/Heap ${heap_used_mb}MB`;
      
      win.setTitle(title_string);
    }, 1000);
    
    //Clean up memory and intervals on close
    win.on("closed", function () {
      clearInterval(title_update_interval);
      win = null;
    });
    
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
    
    //Return statement
    return win;
  }
}

//Initialise social media functions - [WIP] - Modularise this
async function initRPC () {
  try {
    await rpc.login();
    is_rpc_ready = true;
    
    //Set initial activity
    setRPCActivity({
      details: "Default Savefile",
      state: "Idling",
      startTimestamp: Date.now()
    });
  } catch (e) { console.warn(`Failed to connect to Discord RPC:`, e); }
}

function setRPCActivity (arg0_activity) {
  //Convert from parameters
  let activity = arg0_activity;
  
  if (!is_rpc_ready) return;
  rpc.user?.setActivity(activity);
}

//App handling
{
  app.commandLine.appendSwitch("disable-site-isolation-trials");
  app.commandLine.appendSwitch("enable-features", "SharedArrayBuffer");
  app.commandLine.appendSwitch('js-flags', '--max-old-space-size=262144 --expose-gc');
  
  //Launch app when ready
  app.whenReady().then(() => {
    remote_main.initialize();
    
    //Create the window and instantiate it; initialise social media
    let win = createWindow();
      remote_main.enable(win.webContents);
      initRPC();
    
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
    app.on("ready", () => {
      Menu.setApplicationMenu(null);
    });
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      if (details.responseHeaders['Access-Control-Allow-Origin']) {
        // Force the header to be a single value (*) to satisfy Chromium
        details.responseHeaders['Access-Control-Allow-Origin'] = ['*'];
      }
      
      callback({
        responseHeaders: {
          ...details.responseHeaders,
        }
      });
    });
  });
  
  //Window lifecycle defaults
  app.on("before-quit", async () => {
    if (is_rpc_ready) await rpc.destroy();
  })
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

//IPC handling
{
  let ve = require("./UF/js/vercengen/engine/vercengen_electron");
  ve.initialiseIPC();
  
  ipcMain.on("update-presence", (_event, activity) => {
    setRPCActivity(activity);
  });
}