// Drop-in replacement for the old Base44 SDK client. Every other file in the
// app still does `import { base44 } from '@/api/base44Client'` and calls
// `base44.auth.*` / `base44.entities.<Entity>.*` / `base44.integrations.Core.*`
// — this object reproduces that exact shape on top of Supabase, so none of
// those call sites needed to change. See src/api/{supabaseClient,auth,
// entities,integrations}.js for the actual implementations.
import { auth } from './auth';
import { entities } from './entities';
import { Core } from './integrations';

export const base44 = {
  auth,
  entities,
  integrations: { Core },
};
