import { supabase } from './supabaseClient';

// Table names for every Sonora entity, keyed the way the rest of the app
// already refers to them (base44.entities.<Name>).
const TABLES = {
  Song: 'songs',
  Album: 'albums',
  Artist: 'artists',
  Podcast: 'podcasts',
  PodcastEpisode: 'podcast_episodes',
  Playlist: 'playlists',
  Favorite: 'favorites',
  ListeningHistory: 'listening_history',
  Friendship: 'friendships',
  FriendActivity: 'friend_activity',
  Profile: 'profiles',
};

function applySort(query, sort) {
  if (!sort) return query;
  const desc = sort.startsWith('-');
  const column = desc ? sort.slice(1) : sort;
  return query.order(column, { ascending: !desc });
}

// Translates the small subset of Mongo-style query operators actually used
// across the app (equality, $in) into PostgREST filter calls. Extend here if
// a new operator shows up in the codebase.
function applyFilter(query, filter) {
  if (!filter) return query;
  for (const [key, value] of Object.entries(filter)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('$in' in value) { query = query.in(key, value.$in); continue; }
      if ('$gte' in value) { query = query.gte(key, value.$gte); continue; }
      if ('$lte' in value) { query = query.lte(key, value.$lte); continue; }
      if ('$gt' in value) { query = query.gt(key, value.$gt); continue; }
      if ('$lt' in value) { query = query.lt(key, value.$lt); continue; }
      if ('$ne' in value) { query = query.neq(key, value.$ne); continue; }
    }
    query = query.eq(key, value);
  }
  return query;
}

function throwIfError(error) {
  if (error) {
    const e = new Error(error.message || 'Supabase request failed');
    e.status = error.status;
    e.code = error.code;
    throw e;
  }
}

function createEntity(table) {
  return {
    async list(sort, limit) {
      let query = supabase.from(table).select('*');
      query = applySort(query, sort);
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      throwIfError(error);
      return data;
    },

    async filter(filter, sort, limit) {
      let query = supabase.from(table).select('*');
      query = applyFilter(query, filter);
      query = applySort(query, sort);
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      throwIfError(error);
      return data;
    },

    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      throwIfError(error);
      return data;
    },

    async create(payload) {
      const { data, error } = await supabase.from(table).insert(payload).select().single();
      throwIfError(error);
      return data;
    },

    async update(id, payload) {
      const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
      throwIfError(error);
      return data;
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      throwIfError(error);
      return true;
    },

    async bulkCreate(rows) {
      const { data, error } = await supabase.from(table).insert(rows).select();
      throwIfError(error);
      return data;
    },

    async deleteMany(filter) {
      let query = supabase.from(table).delete();
      query = applyFilter(query, filter);
      const { error } = await query;
      throwIfError(error);
      return true;
    },

    schema() {
      throw new Error(`${table}.schema() is not implemented in the Supabase client — inspect supabase/schema.sql instead.`);
    },

    // Mirrors base44's realtime subscribe(): callback receives
    // { type: 'create' | 'update' | 'delete', data }. Returns an unsubscribe
    // function. Requires the table to be added to the `supabase_realtime`
    // publication (see supabase/schema.sql).
    subscribe(callback) {
      const channelName = `${table}-${Math.random().toString(36).slice(2)}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => {
            const type =
              payload.eventType === 'INSERT' ? 'create' :
              payload.eventType === 'UPDATE' ? 'update' : 'delete';
            const data = type === 'delete' ? payload.old : payload.new;
            callback({ type, data });
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    },
  };
}

export const entities = Object.fromEntries(
  Object.entries(TABLES).map(([name, table]) => [name, createEntity(table)])
);
