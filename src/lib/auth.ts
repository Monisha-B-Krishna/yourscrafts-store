import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { loginHref } from "@/lib/auth/redirect";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export interface Profile {
  full_name: string | null;
  phone: string | null;
  role: "customer" | "admin";
}

export interface Session {
  supabase: SupabaseClient;
  user: User;
}

/**
 * The signed-in customer (checked with Supabase Auth, not just read from the
 * cookie) plus a Supabase client acting as them, or null for guests.
 * Cached per request, so layouts and pages can both call it for free.
 */
export const getCurrentUser = cache(async (): Promise<Session | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, user: data.user };
});

export const getProfile = cache(async (session: Session): Promise<Profile | null> => {
  const { data, error } = await session.supabase
    .from("profiles")
    .select("full_name, phone, role")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load profile: ${error.message}`);
  return data as Profile | null;
});

/** For signed-in-only pages: sends guests to the login page, then back here. */
export async function requireUser(returnTo: string): Promise<Session> {
  const session = await getCurrentUser();
  if (!session) redirect(loginHref(returnTo));
  return session;
}

/**
 * For /admin. Middleware already blocks non-admins; this is the second lock.
 * Anyone who isn't the owner just sees "page not found".
 */
export async function requireAdmin(): Promise<Session & { profile: Profile }> {
  const session = await getCurrentUser();
  if (!session) notFound();
  const profile = await getProfile(session);
  if (profile?.role !== "admin") notFound();
  return { ...session, profile };
}
