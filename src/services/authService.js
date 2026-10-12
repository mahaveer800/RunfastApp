import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export const USER_AUTH_KEY = '@user_auth_profile';
export const GALLERY_PASS_KEY = '@gallery_password';


export const getLocalUser = async () => {
  try {
    const raw = await AsyncStorage.getItem(USER_AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Failed to get local user:', error);
    return null;
  }
};

export const isUserRegistered = async () => {
  try {
    const user = await getLocalUser();
    return Boolean(user && user.email);
  } catch {
    return false;
  }
};

export const registerUser = async ({ email, password, name = '' }) => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();
  const cleanName = name.trim();

  if (!cleanEmail || !cleanPassword) {
    throw new Error('Email and password are required.');
  }

  let supabaseUser = null;

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: cleanPassword,
      options: {
        data: { full_name: cleanName },
      },
    });

    if (error) {
      if (error.message?.toLowerCase().includes('already registered')) {
        throw new Error('Account already exists with this email. Please Login instead.');
      }
      if (error.message?.toLowerCase().includes('rate limit')) {
        throw new Error('Supabase email rate limit exceeded. Please turn OFF "Confirm email" in Supabase Authentication settings.');
      }
      throw new Error(error.message);
    }

    supabaseUser = data?.user;

    // Check if Supabase requires email verification
    if (!data?.session) {
      console.warn('Supabase email confirmation is pending for:', cleanEmail);
    }
  }

  const profile = {
    id: supabaseUser?.id || `user_${Date.now()}`,
    email: cleanEmail,
    name: cleanName,
    registeredAt: Date.now(),
    lastLoginAt: Date.now(),
  };

  // Save profile and password locally
  await AsyncStorage.setItem(USER_AUTH_KEY, JSON.stringify(profile));
  await AsyncStorage.setItem(GALLERY_PASS_KEY, cleanPassword);

  return profile;
};

/**
 * Log in with Email & Password (cross-device & local):
 */
export const loginUser = async ({ email, password }) => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanEmail || !password) {
    throw new Error('Email and password are required.');
  }

  let supabaseUser = null;

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    });

    if (error) {
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        throw new Error('Email is not confirmed in Supabase. Please turn OFF "Confirm email" in your Supabase Dashboard (Auth -> Providers -> Email).');
      }
      if (error.message?.toLowerCase().includes('invalid login credentials')) {
        throw new Error('Invalid email or password. Please make sure you registered this account on Supabase first.');
      }
      throw new Error(error.message);
    }

    supabaseUser = data?.user;
  } else {
    // If Supabase is not configured, check locally
    const localUser = await getLocalUser();
    const storedPass = await AsyncStorage.getItem(GALLERY_PASS_KEY);
    if (!localUser || localUser.email !== cleanEmail || storedPass !== cleanPassword) {
      throw new Error('Account not found on this device. Please Sign Up first.');
    }
  }

  const profile = {
    id: supabaseUser?.id || `user_${Date.now()}`,
    email: cleanEmail,
    name: supabaseUser?.user_metadata?.full_name || '',
    lastLoginAt: Date.now(),
  };

  await AsyncStorage.setItem(USER_AUTH_KEY, JSON.stringify(profile));
  await AsyncStorage.setItem(GALLERY_PASS_KEY, cleanPassword);

  return profile;
};

/**
 * Verify gallery password to unlock gallery:
 */
export const verifyGalleryPassword = async (password) => {
  if (!password) return false;

  try {
    const cleanInput = password.trim();
    const storedPass = await AsyncStorage.getItem(GALLERY_PASS_KEY);

    // Fast local verification
    if (storedPass && storedPass === cleanInput) {
      return true;
    }

    // Fallback to Supabase verification
    if (isSupabaseConfigured()) {
      const localUser = await getLocalUser();
      if (localUser?.email) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: localUser.email,
          password: cleanInput,
        });

        if (!error && data?.session) {
          await AsyncStorage.setItem(GALLERY_PASS_KEY, cleanInput);
          return true;
        }
      }
    }
    return false;
  } catch (e) {
    console.error('Password verification error:', e);
    return false;
  }
};

/**
 * Log out user and clear local session
 */
export const logoutUser = async () => {
  try {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    await AsyncStorage.removeItem(USER_AUTH_KEY);
    await AsyncStorage.removeItem(GALLERY_PASS_KEY);
  } catch (error) {
    console.error('Logout error:', error);
  }
};




export const getSupabaseSession = async () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Session check failed: ${error.message}`);
  }

  if (!data?.session?.user) {
    throw new Error(
      'No active Supabase session. Please log in again.',
    );
  }

  return data.session;
};
