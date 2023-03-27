import { Api } from './api/api';
import { ApiRandom } from './api/api-random';
import { ApiTwitter } from './api/api-twitter';
import configManager from './config';
import { filterPost } from './filtering';
import { ApiType, FilterData, Post } from './post';
import { SocketServer } from './socket-server';
import { writeFileSync } from 'fs';
import { join } from 'path';

export class App {
  // the set of all posts ids (filtered and unfiltered)
  private posts_ids: Set<string> = new Set();
  // the list of incoming posts from the api (first stage)
  private cache: (Post & FilterData)[] = [];
  private trash: (Post & FilterData)[] = [];
  private socket: SocketServer;
  private apis: Partial<Record<ApiType, Api>>;
  private rotationInterval: NodeJS.Timeout | null = null;
  private images: Buffer[] = [];

  constructor() {
    this.socket = new SocketServer(this);
    this.apis = { twitter: new ApiTwitter(), random: new ApiRandom() };
    this.restart();
  }

  // Automatically restart the server when the config file is modified
  public restart() {
    const query = configManager.config.query;
    this.clampCache();
    this.clampTrash();
    if (query.useTwitterApi && this.apis.twitter) this.apis.twitter.start(this);
    else if (this.apis.twitter) this.apis.twitter.stop();
    if (query.useRandomApi && this.apis.random) this.apis.random.start(this);
    else if (this.apis.random) this.apis.random.stop();

    if (this.rotationInterval) clearInterval(this.rotationInterval);
    this.rotationInterval = setInterval(() => {
      for (let room of this.socket.getRoomsIds()) {
        const random = Math.random();
        if(random < 0.5) {
          const post = this.getNextPost();
          if (post) this.socket.sendPostToRoom(room, post);
        }
        else {
          const imageToDisplay = this.images[0];
          if(this.images.length > 0) {
            const blob = new Blob([imageToDisplay]);
            const imageUrl = URL.createObjectURL(blob);
            this.socket.sendImageToRoom(room, imageUrl);



          } else {
            console.log('aucune image enregistrée')
          }
          
        }
      }
    }, configManager.config.rotationInterval * 1000);
  }

  /**
   * Adds a new post to the cache but in the front to prioritize it
   */
  public addPosts(posts: Post[]) {
    posts.forEach(async (post) => {
      if (!this.posts_ids.has(post.id)) {
        this.posts_ids.add(post.id);
        const filterData: FilterData = await filterPost(post);

        this.writeInLogsFile('logs.log', { ...post, ...filterData });

        if(filterData.passedBanwords === false || filterData.passedImages === false || filterData.passedSentiment === false){
          this.trash.push({ ...post, ...filterData });
        }else{
          this.cache.unshift({ ...post, ...filterData });
        }

        this.clampCache();
        this.socket.sendCacheToAdmin();
      }
    });
  }

  public getCache(): (Post & FilterData)[] {
    return this.cache;
  }

  public getTrash(): (Post & FilterData)[] {
    return this.trash;
  }

  public writeInLogsFile(filename: string, logs: any) {
    writeFileSync(join(filename), JSON.stringify(logs), {
      flag: 'a+',
    });
  }

  /**
   * Get the next post to send to the client
   * It is the first post in the cache
   * then add it back to the end of the cache
   */
  public getNextPost(): Post | null {
    if (this.cache.length > 0) {
      const post = this.cache[0];
      this.cache.splice(0, 1);
      this.cache.push(post);
      this.clampCache();
      this.socket.sendCacheToAdmin();
      return post;
    }
    return null;
  }

  private clampCache() {
    const max = configManager.config.maxStoreSize;
    if (this.cache.length > max) {
      this.cache.splice(max, this.cache.length - max);
    }
  }

  public clampTrash() {
    const max = configManager.config.maxStoreSize;
    if (this.trash.length > max) {
      this.trash.splice(max, this.trash.length - max);
    }
  }

  public removeDefinitively(id: string) {
    // this.posts_ids.delete(id);
    this.trash = this.trash.filter((post) => post.id !== id);
    this.socket.sendCacheToAdmin();
  }

  public restoreFromTrash(id: string) {
    const post = this.trash.find((post) => post.id === id);
    if (post) {
      this.trash = this.trash.filter((post) => post.id !== id);
      this.cache.unshift(post);
      this.clampCache();
      this.socket.sendCacheToAdmin();
    }
  }

  public moveToTrash(id: string) {
    const post = this.cache.find((post) => post.id === id);
    if (post) {
      this.cache = this.cache.filter((post) => post.id !== id);
      this.trash.unshift(post);
      this.clampTrash();
      this.socket.sendCacheToAdmin();
    }
  }

  public addImages(image: Buffer) {
    console.log("addImages apres:", image);
    this.images.push(image)
    // this.images.push(...images);
  }

  public saveImageToDisk(image: Buffer) {
    console.log("SAVE");
    writeFileSync("/tmp/upload", image);
  }

  public dataURLtoFile(dataurl: string, filename: string): File {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }
  

}
