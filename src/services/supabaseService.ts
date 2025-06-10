// Basic Supabase service for MVP
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class SupabaseService {
  private client: SupabaseClient | null = null;

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.client = createClient(supabaseUrl, supabaseKey);
    }
  }

  get buildPlans() {
    return {
      upsert: async (data: any) => {
        if (!this.client) return null;
        return this.client.from('build_plans').upsert(data);
      },
      
      select: async (query?: string) => {
        if (!this.client) return null;
        return this.client.from('build_plans').select(query || '*');
      }
    };
  }

  get functions() {
    return {
      invoke: async (functionName: string, options: any = {}) => {
        if (!this.client) throw new Error('Supabase not configured');
        return this.client.functions.invoke(functionName, options);
      }
    };
  }
}

export default new SupabaseService(); 