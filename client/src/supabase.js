import { createClient } from '@supabase/supabase-js';

// Reads credentials from Vite env vars, fallback gracefully if not configured yet
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

/**
 * Uploads an image file from device to Supabase Storage bucket 'game-covers'
 * Returns the public CDN URL of the uploaded image.
 */
export async function uploadGameCoverToSupabase(file) {
  if (!supabase) {
    throw new Error('Supabase credentials (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY) are not set in environment variables.');
  }

  // Generate clean unique filename
  const fileExt = file.name.split('.').pop() || 'png';
  const fileName = `cover_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
  const filePath = `${fileName}`;

  // Upload to Supabase Storage 'game-covers' bucket
  const { data, error } = await supabase.storage
    .from('game-covers')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    if (error.message?.toLowerCase().includes('bucket not found') || error.error === 'Bucket not found') {
      throw new Error('Supabase bucket "game-covers" not found. Please create a public bucket named "game-covers" in your Supabase Dashboard -> Storage.');
    }
    throw new Error(error.message || 'Failed to upload image to Supabase Storage');
  }

  // Get public CDN URL
  const { data: publicUrlData } = supabase.storage
    .from('game-covers')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}
