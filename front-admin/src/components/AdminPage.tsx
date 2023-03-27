import { ArrowLeftOnRectangleIcon, CloudArrowDownIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import useSocket from '../../hooks/useSocket';
import type { Config } from '../types/config';
import type { FilterData, Post } from '../types/post';
import AdminForm from './Form';

const AdminPage = () => {
  const [config, setConfig] = useState<null | Config>(null);
  const [serverIp, setServerIp] = useState('http://localhost:3001');
  const [cache, setCache] = useState<(Post & FilterData)[]>([]);
  const [trash, setTrash] = useState<(Post & FilterData)[]>([]);
  const [images, setImages] = useState<FileList | undefined>();

  const socket = useSocket(serverIp, (socket) => {
    socket.on('connect', () => {
      socket.emit('getConfig');
      socket.emit('setadmin');
      console.log("addImages connect avant:", images);
      socket.emit('setImages');
    });
    socket.on('cache', (cache: (Post & FilterData)[]) => {
      setCache(cache);
    });

    socket.on('trash', (cacheFiltered: (Post & FilterData)[]) => {
      setTrash(cacheFiltered);
    });

    socket.on('config', (config: Config) => {
      setConfig(config);
    });

    socket.on('images', (images: FileList) => {
      setImages(images);
    });

    // socket.on('images', (images: File[]) => {
    //   const convertedImages = images.map((image: File) => {
    //     const reader = new FileReader();
    //     reader.readAsDataURL(image);
    //     return new Promise<string>((resolve, reject) => {
    //       reader.onload = () => {
    //         resolve(reader.result as string);
    //       };
    //       reader.onerror = reject;
    //     });
    //   });
    //   Promise.all(convertedImages).then((dataUrls) => setImages(dataUrls));
    // });
  });

  function getConfig() {
    if (!socket) return;
    socket.emit('getConfig');
  }

  function sendConfig(config: Config) {
    console.log("send config...")
    if (!socket) return;
    socket.emit('setConfig', config);
  }

  function cacheDelete(id: string) {
    if (!socket) return;
    socket.emit('cacheDelete', id);
  }

  function trashDelete(id: string) {
    if (!socket) return;
    socket.emit('trashDelete', id);
  }

  async function sendImages(images: FileList | undefined) {
    // console.log("addImages avant:", images);
    // console.log("send images...")
    if (!socket) return;
    // const imageUrls = await convertFilesToDataUrls(images);
    // socket.emit('setImages', images);

    if(images !== undefined) {
      for (let i = 0; i < images.length; i++) {
        socket.emit("setImages", images[i]);
      }
    }
  }

  // function convertFilesToDataUrls(files: File[]): Promise<string[]> {
  //   return Promise.all(files.map((file) => {
  //     return new Promise<string>((resolve, reject) => {
  //       const reader = new FileReader();
  //       reader.onload = () => {
  //         resolve(reader.result as string);
  //       };
  //       reader.onerror = () => {
  //         reject(reader.error);
  //       };
  //       reader.readAsDataURL(file);
  //     });
  //   }));
  // }
  

  if (!socket?.connected || !config)
    return (
      <div className='p-8 flex flex-col items-center gap-10 max-w-6xl grow justify-center'>
        <h1 className='text-6xl font-bold'>WallCaster</h1>
        <div className='col-span-6 sm:col-span-3'>
          <label htmlFor='serverIp' className='block text-sm font-medium text-gray-700'>
            What is the admin panel ip ?
          </label>
          <input
            type='text'
            name='serverIp'
            id='serverIp'
            value={serverIp}
            onChange={(e) => setServerIp(e.target.value)}
            className='mt-1 block w-full max-w-lg border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
          />
        </div>
        <p className='font-bold text-xl opacity-20'>You are not connected</p>
      </div>
    );

  return (
    <div className='p-8 flex flex-col gap-10 max-w-6xl grow'>
      <div className='flex gap-6 items-center px-2 sm:px-6 lg:px-0 '>
        <h1 className='text-4xl font-bold'>WallCaster Admin Panel</h1>
        <div className='mx-auto'></div>
        <button
          className='p-2 text-gray-900 hover:bg-gray-200 rounded-lg'
          onClick={getConfig}
          title='Overwrite with server configuration'
        >
          <CloudArrowDownIcon className='h-6 w-6' />
        </button>
        <button
          className='p-2 bg-red-400 hover:bg-red-500 text-gray-100 hover:text-white rounded-lg'
          onClick={() => {
            setServerIp('http://localhost:3001!');
            setConfig(null);
            setImages(undefined);
          }}
          title='Disconnect'
        >
          <ArrowLeftOnRectangleIcon className='h-6 w-6' />
        </button>
      </div>
      <AdminForm
        config={config}
        cache={cache}
        cacheDelete={cacheDelete}
        setConfig={(c) => sendConfig(c)}
        trash={trash}
        trashDelete={trashDelete}
        images={images}
        setImages={(i) => sendImages(i)}
      />
    </div>
  );
};

export default AdminPage;
