import { supabase } from './supabaseClient';

async function getUserSettings(userId) {
  const { data } = await supabase.from('user_settings').select('*').eq('id', userId).maybeSingle();
  return data;
}

export const auth = {
  // Returns the merged auth.users + user_settings shape the rest of the app
  // expects from base44.auth.me(): id, email, full_name, role, bio,
  // cover_photo_url, display_name, photo_url, share_activity, access_verified.
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      const e = new Error('Not authenticated');
      e.status = 401;
      throw e;
    }
    const settings = await getUserSettings(user.id);
    return {
      id: user.id,
      email: user.email,
      full_name: settings?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || '',
      role: settings?.role || 'user',
      bio: settings?.bio || '',
      cover_photo_url: settings?.cover_photo_url || '',
      display_name: settings?.display_name || '',
      photo_url: settings?.photo_url || user.user_metadata?.avatar_url || '',
      share_activity: settings?.share_activity ?? true,
      access_verified: settings?.access_verified ?? false,
    };
  },

  async updateMe(patch) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('Not authenticated');
    const { error: upsertError } = await supabase
      .from('user_settings')
      .upsert({ id: user.id, ...patch });
    if (upsertError) throw upsertError;
    return true;
  },

  async loginViaEmailPassword(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return true;
  },

  async loginWithProvider(provider, returnTo) {
    const safePath = returnTo && returnTo.startsWith('/') ? returnTo : '/';
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${safePath}` },
    });
    if (error) throw error;
  },

  async register({ email, password }) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return true;
  },

  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
    if (error) throw error;
    return { access_token: data?.session?.access_token || null };
  },

  // No-op: verifyOtp() already persists the session via supabase-js. Kept for
  // call-site compatibility (Register.jsx calls this right after verifyOtp).
  setToken() {},

  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw error;
  },

  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  async resetPassword({ newPassword }) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  async logout(redirectAfter) {
    await supabase.auth.signOut();
    if (redirectAfter !== undefined) {
      window.location.href = '/login';
    }
  },

  redirectToLogin(returnUrl) {
    let path = '/';
    try {
      const url = new URL(returnUrl, window.location.origin);
      path = url.pathname + url.search;
    } catch {
      // ignore malformed returnUrl, fall back to '/'
    }
    window.location.href = `/login?returnTo=${encodeURIComponent(path)}`;
  },
};
