import NodeCache from 'node-cache';

class CacheService {
    private static instance: CacheService;
    private cache: NodeCache;
    
    private constructor() {
        this.cache = new NodeCache({
            stdTTL: 120,
            checkperiod: 120, 
        });
    }
    
    public static getInstance(): CacheService {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }
    
    public get<T>(key: string): T | undefined {
        return this.cache.get<T>(key);
    }
    
    public set<T>(key: string, value: T): boolean {
        return this.cache.set(key, value);
    }
    
    public del(key: string): number {
        return this.cache.del(key);
    }
    
    public flush(): void {
        this.cache.flushAll();
    }
    
    public getStats() {
        return this.cache.getStats();
    }
}

export const cacheService = CacheService.getInstance();
