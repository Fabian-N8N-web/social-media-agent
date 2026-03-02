import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iosuxvmkcmgenesirlfb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvc3V4dm1rY21nZW5lc2lybGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNDQwNTMsImV4cCI6MjA4NTcyMDA1M30.TcCRHRX8kryRZXt0lLI_8iJptWXlAb5LJ34OG49vM_4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SupabaseService = {
  // ---- POSTS ----
  async getPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getPostedPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'posted')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getScheduledPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true });
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

  async updatePost(postId: string, updates: any) {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', postId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deletePost(postId: string) {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);
    if (error) throw error;
  },

  // ---- CONFIG ----
  async getConfig(userId: string = 'admin') {
    const { data, error } = await supabase
      .from('config')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .single();
    if (error) { console.warn('Config nicht gefunden:', error.message); return null; }
    return data;
  },

  async updateConfig(config: any, userId: string = 'admin') {
    const { data: existing } = await supabase
      .from('config')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (existing) {
      const { error } = await supabase.from('config').update(config).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('config').insert([{ ...config, user_id: userId }]);
      if (error) throw error;
    }
  },

  // ---- BOT STATUS ----
  async getBotStatus() {
    const { data, error } = await supabase
      .from('bot_status')
      .select('*')
      .limit(1)
      .single();
    if (error) { console.warn('Bot-Status nicht gefunden:', error.message); return null; }
    return data;
  },

  async updateBotStatus(isActive: boolean) {
    const { data: existing } = await supabase
      .from('bot_status')
      .select('id')
      .limit(1)
      .single();

    if (existing) {
      const { error } = await supabase.from('bot_status')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('bot_status').insert([{ is_active: isActive }]);
      if (error) throw error;
    }
  },

  // ---- IMAGE UPLOAD ----
  async uploadImage(file: File): Promise<string> {
    const fileName = `post_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage
      .from('social-media-images')
      .upload(fileName, file, { contentType: file.type, upsert: false });
    if (error) {
      // Forward the actual Supabase error message
      throw new Error(error.message || JSON.stringify(error));
    }
    const { data: urlData } = supabase.storage
      .from('social-media-images')
      .getPublicUrl(fileName);
    return urlData.publicUrl;
  }
};