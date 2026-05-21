import { supabase } from '../supabase';
import { User, UserRole } from '../../data/mockData';
import { fetchProfile } from './profiles';

export interface SignupParams {
  email: string;
  password: string;
  name: string;
  username: string;
  role: Exclude<UserRole, 'admin'>;
  bio?: string;
  industry?: string;
}

const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '??';

export const signInWithPassword = async (
  email: string,
  password: string,
): Promise<User> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  if (!data.user) throw new Error('Login failed: no user returned.');
  const profile = await fetchProfile(data.user.id);
  if (!profile) throw new Error('Profile not found for this account.');
  if (profile.suspended) {
    await supabase.auth.signOut();
    throw new Error('Account is suspended.');
  }
  return profile;
};

export class EmailConfirmationRequired extends Error {
  constructor(public email: string) {
    super(`Verification email sent to ${email}.`);
    this.name = 'EmailConfirmationRequired';
  }
}

export const signUpWithPassword = async (params: SignupParams): Promise<User> => {
  const email = params.email.trim().toLowerCase();
  const handle = params.username.startsWith('@') ? params.username : `@${params.username}`;
  const avatar = initialsOf(params.name);

  const { data, error } = await supabase.auth.signUp({
    email,
    password: params.password,
    options: {
      data: {
        name: params.name,
        username: handle,
        avatar,
        role: params.role,
      },
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error('Signup failed: no user returned.');
  if (!data.session) {
    // Project requires email confirmation; user can't sign in until they
    // click the link. Surface this as a discrete state.
    throw new EmailConfirmationRequired(email);
  }

  // The handle_new_user trigger creates a base profile row. We patch with the
  // remaining details (role, bio, industry) in a follow-up update and mark
  // the profile complete so the post-OAuth gate doesn't trip.
  const patch: Record<string, unknown> = {
    role: params.role,
    bio: params.bio ?? '',
    profile_complete: true,
  };
  if (params.industry) patch.industry = params.industry;

  const { error: updateErr } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', data.user.id);
  if (updateErr) throw updateErr;

  const profile = await fetchProfile(data.user.id);
  if (!profile) throw new Error('Profile creation failed.');
  return profile;
};

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
};
