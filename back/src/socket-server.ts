import * as io from 'socket.io';
import { App } from './app';
import configManager, { Config } from './config';
import { Post } from './post';
import { readdirSync, readFile, unlinkSync } from 'fs';

const LISTENING_PORT = 3001;

type SocketId = string;

export class SocketServer {
  private rooms: Map<string, SocketId[]> = new Map();
  private server: io.Server;
  private clients: Map<SocketId, io.Socket> = new Map();
  private app: App;

  constructor(app: App) {
    this.app = app;
    this.server = new io.Server({ cors: { origin: '*' } });
    this.server.on('connection', this.onConnect.bind(this));
    this.server.on('disconnect', this.onDisconnect.bind(this));
    this.server.listen(LISTENING_PORT);
    console.log('listening for connections on port', LISTENING_PORT);
  }

  public kill() {
    this.server.removeAllListeners();
    this.server.close();
  }

  public getRoomsIds(): string[] {
    return Array.from(this.rooms.keys());
  }

  private onConnect(socket: io.Socket) {
    // add new client to the list
    if (!this.rooms.has('default')) this.rooms.set('default', [socket.id]);
    else this.rooms.get('default')!.push(socket.id);
    socket.join('default');
    this.clients.set(socket.id, socket);

    // add listeners

    // socket.onAny((event, ...args) => {
    //   console.log(`incoming event '${event}':`, args);
    // });

    socket.on('getConfig', () => {
      socket.emit('config', configManager.config);
    });

    socket.on('setConfig', (config: Config) => {
      configManager.config = config;
      configManager.writeConfigToFile();
      this.app.restart();
      socket.emit('config', configManager.config);
    });

    socket.on('setadmin', () => {
      socket.join('admin');
      this.sendCacheToAdmin();
    });

    socket.on('cacheDelete', (id: string) => {
      this.app.moveToTrash(id);
    });

    socket.on('trashRestore', (id: string) => {
      this.app.restoreFromTrash(id);
    });

    socket.on('trashDelete', (id: string) => {
      this.app.removeDefinitively(id);
    });

    socket.on('restore', (id: string) => {
      this.app.restoreFromTrash(id);
    });

    socket.on('clearTrash', () => {
      this.app.clearTrash();
    });

    socket.on('clearAll', () => {
      this.app.clearAll();
    });

    socket.on('restore', (id: string) => {
      this.app.restoreFromTrash(id);
    });

    socket.on('clearTrash', () => {
      this.app.clearTrash();
    });

    socket.on('setImages', (images) => {
      const files = readdirSync("assets")
      for(var i=0; i<files.length; i++) {
        const path = "assets/" + files[i];
        unlinkSync(path);
      }
      // this.app.addImages(images);
      this.app.saveImageToDisk(images);
      this.sendImagesToAdmin()
    })

    socket.on('getImages', async () => {
      const files = readdirSync("assets");
    const promises = [];
  
    for (var i = 0; i < files.length; i++) {
      const path = "assets/" + files[i];
      promises.push(
        new Promise((resolve, reject) => {
          readFile(path, (err, buffer) => {
            if (err) reject(err);
            else resolve(buffer.toString('base64'));
          });
        })
      );
    }
  
    try {
      const buffers = await Promise.all(promises);
      this.server.to('admin').emit('images', { images: true, buffers: buffers });
    } catch (error) {
      console.error(error);
    }
    })  


    console.log('new client connected');
  }

  private onDisconnect(socket: io.Socket) {
    // remove client from the rooms
    this.rooms.forEach((clientsIds, room) => {
      const index = clientsIds.indexOf(socket.id);
      if (index > -1) {
        clientsIds.splice(index, 1);
        if (clientsIds.length === 0) this.rooms.delete(room);
      }
    });

    // remove client from the list
    this.clients.delete(socket.id);

    // remove all listeners
    socket.removeAllListeners();

    console.log('client disconnected');
  }

  // send post to all clients
  public sendPostToAll(post: Post) {
    console.log('sending post to all clients : ' + post.id);

    this.rooms.forEach((_, room) => {
      this.server.to(room).emit('post', post);
    });
  }

  public sendPostToRoom(room: string, post: Post) {
    console.log('sending post to room ' + room + ' : ' + post.id);
    this.server.to(room).emit('post', post);
  }

  public sendImageToRoom(room: string, path: string) {
    readFile(path, (err, buffer) =>{
      console.log('sending image to room ' + room + ' : ' + path);
      this.server.to(room).emit('image', buffer.toString('base64'));
    });
  }

  public getNumberOfClients(): number {
    return this.clients.size;
  }

  // send post to a specific client
  public sendPostTo(clientId: SocketId, post: Post) {
    if (this.clients.has(clientId)) this.clients.get(clientId)!.emit('post', post);
  }

  public sendCacheToAdmin() {
    this.server.to('admin').emit('cache', this.app.getCache());
    this.server.to('admin').emit('trash', this.app.getTrash());
  }

  public async sendImagesToAdmin() {
    const files = readdirSync("assets");
    const promises = [];
  
    for (var i = 0; i < files.length; i++) {
      const path = "assets/" + files[i];
      promises.push(
        new Promise((resolve, reject) => {
          readFile(path, (err, buffer) => {
            if (err) reject(err);
            else resolve(buffer.toString('base64'));
          });
        })
      );
    }
  
    try {
      const buffers = await Promise.all(promises);
      this.server.to('admin').emit('images', { images: true, buffers: buffers });
    } catch (error) {
      console.error(error);
    }
  }
  
}
