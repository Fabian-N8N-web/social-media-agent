import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iosuxvmkcmgenesirlfb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvc3V4dm1rY21nZW5lc2lybGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNDQwNTMsImV4cCI6MjA4NTcyMDA1M30.TcCRHRX8kryRZXt0lLI_8iJptWXlAb5LJ34OG49vM_4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SupabaseService = {
  async getPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createPost(post: any) {
    const { data, error } = await supabase
      .from('posts')
      .insert([post])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getConfig() {
    const { data, error } = await supabase
      .from('config')
      .select('*')
      .single();
    
    if (error) return null;
    return data;
  },

  async updateConfig(config: any) {
    const { error } = await supabase
      .from('config')
      .upsert(config);
    
    if (error) throw error;
  },

  async getBotStatus() {
    const { data, error } = await supabase
      .from('bot_status')
      .select('*')
      .single();
    
    if (error) return null;
    return data;
  },

  async updateBotStatus(isActive: boolean) {
    const { error } = await supabase
      .from('bot_status')
      .upsert({ is_active: isActive });
    
    if (error) throw error;
  }
};
