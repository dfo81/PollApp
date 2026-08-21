import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Database } from './database.types';

/**
 * Holds the single Supabase client of the app.
 * The app has no login, so sessions are not persisted.
 */
@Injectable({ providedIn: 'root' })
export class Supabase {
  /** Typed Supabase client, authenticated with the public anon key. */
  readonly client: SupabaseClient<Database> = createClient<Database>(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
    {
      auth: {
        persistSession: false,
      },
    },
  );
}
