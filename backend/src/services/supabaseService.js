const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SECRET_KEY;
const bucketName = process.env.SUPABASE_BUCKET || 'report-media';

let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    console.log('✅ Supabase client initialized successfully.');
  } catch (err) {
    console.error('⚠️ Failed to initialize Supabase client:', err.message);
  }
} else {
  console.log('ℹ️ Supabase credentials not found in environment. Running in local fallback mode.');
}

/**
 * Upload a media buffer directly to Supabase Storage
 * Returns the permanent public CDN URL
 */
async function uploadToStorage(buffer, originalname, mimetype) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const ext = path.extname(originalname).toLowerCase();
  const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(uniqueFileName, buffer, {
      contentType: mimetype,
      upsert: false
    });

  if (error) {
    throw error;
  }

  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(uniqueFileName);

  return urlData.publicUrl;
}

module.exports = {
  supabase,
  uploadToStorage,
  isConfigured: Boolean(supabase)
};
