import AsyncStorage from '@react-native-async-storage/async-storage';
import { VPNProfile, WireGuardConfig } from '../types/wireguard';

export { VPNProfile };

const STORAGE_KEY = '@vpn_profiles';
const ACTIVE_PROFILE_KEY = '@active_profile';

/**
 * Generate a unique ID for a profile
 */
function generateId(): string {
  return `profile_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a default name for a profile
 */
async function generateProfileName(): Promise<string> {
  const profiles = await getProfiles();
  const profileCount = profiles.length + 1;
  return `VPN ${profileCount}`;
}

/**
 * Get all saved VPN profiles
 */
export async function getProfiles(): Promise<VPNProfile[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const profiles = JSON.parse(data) as VPNProfile[];
    return profiles;
  } catch (error) {
    console.error('Error loading profiles:', error);
    return [];
  }
}

/**
 * Get a single profile by ID
 */
export async function getProfile(id: string): Promise<VPNProfile | null> {
  try {
    const profiles = await getProfiles();
    return profiles.find((p) => p.id === id) || null;
  } catch (error) {
    console.error('Error getting profile:', error);
    return null;
  }
}

/**
 * Save a new VPN profile
 * @param name - Profile name (optional, will be auto-generated if not provided)
 * @param config - WireGuard configuration
 * @returns The profile ID (existing if duplicate found, new if created)
 */
export async function saveProfile(config: WireGuardConfig, name?: string): Promise<string> {
  try {
    const profiles = await getProfiles();

    // Check if a profile with the same endpoint already exists
    const inputAddresses = Array.isArray(config.interface.address)
      ? config.interface.address
      : [config.interface.address];

    const existingProfile = profiles.find((p) => {
      const profileAddresses = Array.isArray(p.config.interface.address)
        ? p.config.interface.address
        : [p.config.interface.address];
      // Check if arrays are equal (regardless of order)
      if (profileAddresses.length !== inputAddresses.length) return false;
      return profileAddresses.every((addr) => inputAddresses.includes(addr));
    });

    if (existingProfile) {
      // Update the existing profile with the new config and name if provided
      const updatedProfile = {
        ...existingProfile,
        config,
        ...(name && { name }),
        lastUsed: new Date().toISOString(),
      };

      await updateProfile(existingProfile.id, updatedProfile);
      return existingProfile.id;
    }

    // Create new profile if no duplicate found
    const newProfile: VPNProfile = {
      id: generateId(),
      name: name || (await generateProfileName()),
      config,
      createdAt: new Date().toISOString(),
      isActive: false,
    };

    profiles.push(newProfile);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));

    console.log(`Created new profile with ID: ${newProfile.id}`);
    return newProfile.id;
  } catch (error) {
    console.error('Error saving profile:', error);
    throw new Error('Failed to save profile');
  }
}

/**
 * Update an existing profile
 */
export async function updateProfile(
  id: string,
  updates: Partial<Omit<VPNProfile, 'id' | 'createdAt'>>
): Promise<void> {
  try {
    const profiles = await getProfiles();
    const index = profiles.findIndex((p) => p.id === id);

    if (index === -1) {
      throw new Error('Profile not found');
    }

    profiles[index] = {
      ...profiles[index],
      ...updates,
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch (error) {
    console.error('Error updating profile:', error);
    throw new Error('Failed to update profile');
  }
}

/**
 * Delete a profile
 */
export async function deleteProfile(id: string): Promise<void> {
  try {
    const profiles = await getProfiles();
    const filtered = profiles.filter((p) => p.id !== id);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    // If this was the active profile, clear active profile
    const activeId = await getActiveProfileId();
    if (activeId === id) {
      await setActiveProfileId(null);
    }
  } catch (error) {
    console.error('Error deleting profile:', error);
    throw new Error('Failed to delete profile');
  }
}

/**
 * Mark a profile as last used (updates lastUsed timestamp)
 */
export async function markProfileUsed(id: string): Promise<void> {
  await updateProfile(id, {
    lastUsed: new Date().toISOString(),
  });
}

/**
 * Get the currently active profile ID
 */
export async function getActiveProfileId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
  } catch (error) {
    console.error('Error getting active profile:', error);
    return null;
  }
}

/**
 * Set the active profile ID
 */
export async function setActiveProfileId(id: string | null): Promise<void> {
  try {
    if (id === null) {
      await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);

      // Mark all profiles as inactive
      const profiles = await getProfiles();
      for (const profile of profiles) {
        if (profile.isActive) {
          await updateProfile(profile.id, { isActive: false });
        }
      }
    } else {
      await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, id);

      // Update profile states
      const profiles = await getProfiles();
      for (const profile of profiles) {
        await updateProfile(profile.id, { isActive: profile.id === id });
      }
    }
  } catch (error) {
    console.error('Error setting active profile:', error);
    throw new Error('Failed to set active profile');
  }
}

/**
 * Get the active profile
 */
export async function getActiveProfile(): Promise<VPNProfile | null> {
  const activeId = await getActiveProfileId();
  if (!activeId) return null;
  return await getProfile(activeId);
}

/**
 * Get recent profiles (sorted by lastUsed, then createdAt)
 */
export async function getRecentProfiles(limit: number = 5): Promise<VPNProfile[]> {
  const profiles = await getProfiles();

  return profiles
    .sort((a, b) => {
      const aTime = a.lastUsed || a.createdAt;
      const bTime = b.lastUsed || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    })
    .slice(0, limit);
}

/**
 * Clear all profiles (use with caution)
 */
export async function clearAllProfiles(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
  } catch (error) {
    console.error('Error clearing profiles:', error);
    throw new Error('Failed to clear profiles');
  }
}

/**
 * Check if a profile with the same endpoint already exists
 */
export async function profileExists(endpoint: string): Promise<boolean> {
  const profiles = await getProfiles();
  return profiles.some((p) => p.config.peer.endpoint === endpoint);
}