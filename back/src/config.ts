import { join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

export type Config = {
  maxStoreSize: number;
  rotationInterval: number;
  query: {
    useTwitterApi: boolean;
    twitter: {
      fetchInterval: number;
      fetchQuantity: number;
      maxDateRange: number;
      useWhitelistHashtags: boolean;
      whitelistHashtags: string[];
      keywords: string[];
      languages: string[];
      useWhitelistAuthors: boolean;
      whitelistAuthors: string[];
    };
    useRandomApi: boolean;
    random: {
      fetchInterval: number;
    };
  };
  filter: {
    useSentiment: boolean;
    useBanwords: boolean;
    useNsfw: boolean;
    useBlockImages: boolean;
    forbiddenWords: string[];
  };
};

export type DateRange = {
  start: Date;
  end: Date;
};

/**
 * The config class
 * Singleton
 * @note The config is saved in a file called settings.json
 * @note intervals are in seconds
 */
class ConfigManager {
  config: Config = {
    maxStoreSize: 100,
    rotationInterval: 1,
    query: {
      useTwitterApi: true,
      twitter: {
        fetchInterval: 30,
        fetchQuantity: 10,
        maxDateRange: 7,
        useWhitelistHashtags: false,
        whitelistHashtags: [],
        keywords: [],
        languages: ['fr', 'en'],
        useWhitelistAuthors: false,
        whitelistAuthors: [],
      },
      useRandomApi: false,
      random: {
        fetchInterval: 2,
      },
    },
    filter: {
      useSentiment: false,
      useBanwords: false,
      useNsfw: false,
      useBlockImages: false,
      forbiddenWords: [],
    },
  };
  
  public constructor() {
    this.readConfigFromFile();
  }

  /**
   * Writes the config to a file
   * @param config The config to write
   * @param fileName The name of the file to write to (default: settings.json)
   * @note overwrites the file if it already exists
   */
  public writeConfigToFile(fileName: string = 'settings.json'): void {
    let contentToWrite: any = JSON.stringify(this.config, null, 2);
    writeFileSync(join(__dirname, fileName), contentToWrite, {
      flag: 'w',
    });
  }

  /**
   * Reads the config from a file and save it to the config object
   * @param fileName The name of the file to read from (default: settings.json)
   */
  public readConfigFromFile(fileName: string = 'settings.json'): void {
    try {
      const content = readFileSync(join(__dirname, fileName), 'utf8');
      this.config = JSON.parse(content);
    } catch (e) {
      console.log('No config file found. Using default config.');
    }
  }
}

const configManager = new ConfigManager();
export default configManager;
