import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SupabaseService = {
  // ---- AUTH ----
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },

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

  // ---- PRODUCTS ----
  async getProducts(userId: string = 'admin') {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async createProduct(product: { name: string; description?: string; tags?: string[]; entry_type?: 'product' | 'service' | null; user_id?: string }) {
    const { data, error } = await supabase
      .from('products')
      .insert([{ ...product, user_id: product.user_id || 'admin' }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateProduct(id: string, updates: { name?: string; description?: string; tags?: string[]; image_mode?: string; entry_type?: 'product' | 'service' | null }) {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteProduct(id: string) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ---- PRODUCT IMAGES ----
  async getProductImages(productId: string) {
    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async createProductImage(image: {
    product_id: string;
    user_id?: string;
    original_url: string;
    mode: string;
    processing_status?: string;
  }) {
    const { data, error } = await supabase
      .from('product_images')
      .insert([{ ...image, user_id: image.user_id || 'admin', processing_status: image.processing_status || 'pending' }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateProductImage(id: string, updates: {
    processed_url?: string;
    mode?: string;
    processing_status?: string;
  }) {
    const { data, error } = await supabase
      .from('product_images')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteProductImage(id: string) {
    const { error } = await supabase
      .from('product_images')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async uploadProductImage(file: File): Promise<string> {
    const fileName = `product_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(error.message);
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);
    return urlData.publicUrl;
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