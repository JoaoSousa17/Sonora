import { supabase, UPLOADS_BUCKET } from './supabaseClient';

function randomId() {
  return (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
}

export const Core = {
  // Uploads an image (playlist cover, avatar, profile cover) to the public
  // "sonora-uploads" storage bucket, under the current user's own folder
  // (enforced by storage RLS — see supabase/schema.sql). Mirrors Base44's
  // Core.UploadFile({ file }) -> { file_url }.
  async UploadFile({ file }) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Not authenticated');

    const ext = file.name?.includes('.') ? file.name.split('.').pop() : '';
    const path = `${user.id}/${randomId()}${ext ? `.${ext}` : ''}`;

    const { error } = await supabase.storage.from(UPLOADS_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;

    const { data } = supabase.storage.from(UPLOADS_BUCKET).getPublicUrl(path);
    return { file_url: data.publicUrl };
  },

  // Sends a transactional email (friend invites, problem reports) via a
  // Supabase Edge Function — the Resend API key never reaches the browser.
  async SendEmail({ to, subject, body, from_name }) {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, body, from_name },
    });
    if (error) throw error;
    return data;
  },

  // Generates a short, original description of a song's theme/mood — NOT the
  // actual lyrics (see supabase/functions/invoke-llm for why). Kept under the
  // InvokeLLM name for call-site compatibility with LyricsPanel.jsx, which
  // only reads `res.response` / `res.text` / a bare string.
  async InvokeLLM({ songTitle, artistName }) {
    const { data, error } = await supabase.functions.invoke('invoke-llm', {
      body: { songTitle, artistName },
    });
    if (error) throw error;
    return data;
  },

  async GenerateImage() {
    throw new Error('Core.GenerateImage is not implemented in this deployment.');
  },
  async GenerateVideo() {
    throw new Error('Core.GenerateVideo is not implemented in this deployment.');
  },
  async GenerateSpeech() {
    throw new Error('Core.GenerateSpeech is not implemented in this deployment.');
  },
  async TranscribeAudio() {
    throw new Error('Core.TranscribeAudio is not implemented in this deployment.');
  },
  async ExtractDataFromUploadedFile() {
    throw new Error('Core.ExtractDataFromUploadedFile is not implemented in this deployment.');
  },
};
