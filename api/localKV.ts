/**
 * Simple in-memory KV store for local development
 * This mimics the Vercel KV API for local testing
 */

interface KVOptions {
  ex?: number; // Expiration in seconds
}

interface StoredItem {
  value: string;
  expiresAt?: number;
}

class LocalKV {
  private store: Map<string, StoredItem> = new Map();

  /**
   * Set a value in the store with optional expiration
   */
  async set(key: string, value: string, options?: KVOptions): Promise<string> {
    const item: StoredItem = {
      value
    };
    
    // Set expiration if provided
    if (options?.ex) {
      item.expiresAt = Date.now() + (options.ex * 1000);
    }
    
    this.store.set(key, item);
    return 'OK';
  }

  /**
   * Get a value from the store
   */
  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    
    // Check if item exists
    if (!item) {
      return null;
    }
    
    // Check if item has expired
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }

  /**
   * Delete a value from the store
   */
  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    const keys: string[] = [];
    
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        // Check if item has expired
        const item = this.store.get(key);
        if (item && (!item.expiresAt || item.expiresAt > Date.now())) {
          keys.push(key);
        } else if (item) {
          // Clean up expired item
          this.store.delete(key);
        }
      }
    }
    
    return keys;
  }
}

// Export a singleton instance
export const localKV = new LocalKV();
