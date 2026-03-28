//Import libraries
let { app, BrowserWindow, dialog, ipcMain, session, shell } = require("electron");
let fs = require("fs");
let path = require("path");
let readline = require("readline");
let { performance } = require("perf_hooks");

//Metadata - Title
let latest_fps = 0;
let naissance_version = "1.7b Chukchi";
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
    win.loadFile("index.html").then(() => {
			win.webContents.openDevTools();
			win.setMenuBarVisibility(false);
		});

    //Listen for FPS updates from the renderer process
    ipcMain.on("update-fps", (event, fps) => {
      latest_fps = fps;
    });

    //Update the title every second with the latest data
    title_update_interval = setInterval(function () {
			let memory_usage = process.memoryUsage();

      let heap_used_mb = (memory_usage.heapUsed/1024/1024).toFixed(2);
			let rss_mb = (memory_usage.rss/1024/1024).toFixed(2);
			let title_string = `Naissance (SVEA/Collation) ${naissance_version} - FPS: ${latest_fps} | RAM: RSS ${rss_mb}MB/Heap ${heap_used_mb}MB`;

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
}

//App handling
{
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
  /**
   * Utility to read a file line-by-line backwards without loading it all into memory.
   * This prevents the OOM crash.
   */
  async function* readLinesBackwards(filePath) {
    const stats = fs.statSync(filePath);
    const fd = fs.openSync(filePath, 'r');
    const bufferSize = 64 * 1024; // 64KB chunks
    const buffer = Buffer.alloc(bufferSize);
    let pos = stats.size;
    let leftover = '';
    
    while (pos > 0) {
      const end = pos;
      pos = Math.max(0, pos - bufferSize);
      const length = end - pos;
      
      fs.readSync(fd, buffer, 0, length, pos);
      let chunk = buffer.toString('utf8', 0, length) + leftover;
      let lines = chunk.split(/\r?\n/);
      
      // The first line in the chunk might be incomplete (split across buffers)
      leftover = lines.shift();
      
      // Yield lines from the end of this chunk (which is newer in the file)
      for (let i = lines.length - 1; i >= 0; i--) {
        yield lines[i];
      }
    }
    if (leftover) yield leftover;
    fs.closeSync(fd);
  }
  
  ipcMain.on('request-ontology-stream', async (event, folderPath) => {
    const webContents = event.sender;
    
    // 1. Sort files descending (YYYY.MM.DD)
    const files = fs.readdirSync(folderPath)
    .filter(f => f.endsWith('.ontology'))
    .sort((a, b) => b.localeCompare(a));
    
    async function* getOntologyBatches() {
      let batch = {};
      let count = 0;
      
      for (const file of files) {
        const filePath = path.join(folderPath, file);
        
        // 2. Process each file backwards line-by-line
        for await (const line of readLinesBackwards(filePath)) {
          if (!line.trim()) continue;
          
          const json_start = line.indexOf('{');
          if (json_start === -1) continue;
          
          const id = line.substring(0, json_start).trim();
          try {
            const kf = JSON.parse(line.substring(json_start));
            kf._saved = true;
            
            if (!batch[id]) batch[id] = [];
            batch[id].push(kf);
            count++;
            
            // Smaller batch size (256) is better for IPC stability
            if (count >= 256) {
              yield batch;
              batch = {};
              count = 0;
            }
          } catch (e) {}
        }
        
        console.log(`Finished reading ${file}`);
      }
      if (Object.keys(batch).length > 0) yield batch;
    }
    
    const currentStream = getOntologyBatches();
    
    const sendNext = async () => {
      const { value, done } = await currentStream.next();
      if (done) {
        webContents.send('ontology-stream-done');
        ipcMain.removeListener('ontology-stream-next', sendNext);
      } else {
        webContents.send('ontology-stream-batch', value);
      }
    };
    
    ipcMain.removeAllListeners('ontology-stream-next');
    ipcMain.on('ontology-stream-next', sendNext);
    sendNext();
  });
}