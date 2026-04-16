export type ImageMode = 'original' | 'removed_bg' | 'replaced_bg' | 'ai_generated';

export type BusinessType = 'products' | 'services' | 'mixed';

export interface Config {
  tonality: string;
  topic: string;
  businessType: BusinessType;
  industry: string;
  targetAudience: string;
  ageRange: { min: number; max: number };
  postFrequency: number;
  postFrequencyUnit: 'week' | 'day';
  publishWindow: { start: string; end: string };
  hashtags: string[];
  emojiUsage: string;
  language: string;
  imagePrompt: string;
  imageStyle: string;
  textLength: number;
  websiteUrl: string;
  brandContext: string;
  brandContextUpdatedAt: string;
  brandKeywords: string;
  styleMode: 'auto' | 'manual';
  enabledPostTypes: string[];
  imageFallbackMode: ImageMode;
  setupCompleted: boolean;
  publishPlatform: 'both' | 'facebook' | 'instagram';
  imageModels: {
    people: string;  // Replicate-Slug, z.B. "google/imagen-4"
    scene: string;   // Replicate-Slug, z.B. "black-forest-labs/flux-1.1-pro-ultra"
  };
  styleOverrides: {
    tonality: 'auto' | 'manual';
    targetAudience: 'auto' | 'manual';
    ageRange: 'auto' | 'manual';
    language: 'auto' | 'manual';
    emojiUsage: 'auto' | 'manual';
    hashtags: 'auto' | 'manual';
  };
}

export interface ProductImage {
  id: string;
  product_id: string;
  user_id: string;
  original_url: string;
  processed_url?: string;
  mode: 'original' | 'removed_bg' | 'replaced_bg' | 'img2img' | 'ai_generated';
  processing_status: 'pending' | 'processing' | 'done' | 'error';
  created_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  tags?: string[];
  image_mode: ImageMode;
  entry_type?: 'product' | 'service' | null;
  created_at: string;
  images?: ProductImage[];
}

export interface PostEngagement {
  likes: number;
  comments: number;
  shares: number;
}

export interface Post {
  id?: string;
  content: string;
  timestamp: string;
  status: string;
  contentType: string;
  platform?: string;
  engagement?: PostEngagement;
  imageUrl?: string;
  scheduled_at?: string;
}

export interface ToastData {
  message: string;
  type: 'success' | 'error' | 'info';
}
