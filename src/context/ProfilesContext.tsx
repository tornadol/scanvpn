import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { VPNProfile } from '@/lib/types/wireguard';
import { getProfiles, deleteProfile } from '@/lib/wireguard/storage';
import { useFocusEffect } from '@react-navigation/native';
import { useToast } from '@/components/nativewindui/Toast';

export interface ProfilesState {
  profiles: VPNProfile[];
  loading: boolean;
  refreshing: boolean;
  lastProfileCount: number;
}

export type ProfilesAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_PROFILES'; payload: VPNProfile[] }
  | { type: 'DELETE_PROFILE'; payload: string }
  | { type: 'REFRESH_PROFILES' }
  | { type: 'SET_LAST_PROFILE_COUNT'; payload: number };

const initialState: ProfilesState = {
  profiles: [],
  loading: true,
  refreshing: false,
  lastProfileCount: 0,
};

function profilesReducer(
  state: ProfilesState,
  action: ProfilesAction,
): ProfilesState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_REFRESHING':
      return { ...state, refreshing: action.payload };

    case 'SET_PROFILES':
      return { ...state, profiles: action.payload };

    case 'DELETE_PROFILE':
      return {
        ...state,
        profiles: state.profiles.filter(
          profile => profile.id !== action.payload,
        ),
      };

    case 'REFRESH_PROFILES':
      return { ...state };

    case 'SET_LAST_PROFILE_COUNT':
      return { ...state, lastProfileCount: action.payload };

    default:
      return state;
  }
}

// Context interface
export interface ProfilesContextType {
  state: ProfilesState;
  dispatch: React.Dispatch<ProfilesAction>;
  // Actions
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setProfiles: (profiles: VPNProfile[]) => void;
  deleteProfile: (profile: VPNProfile) => void;
  refreshProfiles: () => Promise<void>;
  initializeProfiles: () => Promise<void>;
  checkForNewProfiles: () => void;
}

// Create context
const ProfilesContext = createContext<ProfilesContextType | undefined>(
  undefined,
);

// Provider component
export function ProfilesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(profilesReducer, initialState);
  const { showToast } = useToast();

  // Action creators
  const actions = {
    setLoading: (loading: boolean) =>
      dispatch({ type: 'SET_LOADING', payload: loading }),
    setRefreshing: (refreshing: boolean) =>
      dispatch({ type: 'SET_REFRESHING', payload: refreshing }),
    setProfiles: (profiles: VPNProfile[]) =>
      dispatch({ type: 'SET_PROFILES', payload: profiles }),
    deleteProfile: (id: string) =>
      dispatch({ type: 'DELETE_PROFILE', payload: id }),
    refreshProfiles: () => dispatch({ type: 'REFRESH_PROFILES' }),
    setLastProfileCount: (count: number) =>
      dispatch({ type: 'SET_LAST_PROFILE_COUNT', payload: count }),
  };

  // Business logic functions
  const initializeProfiles = async () => {
    try {
      actions.setLoading(true);
      const savedProfiles = await getProfiles();
      actions.setProfiles(savedProfiles);
      actions.setLastProfileCount(savedProfiles.length);
    } catch (error) {
      console.error('Error loading profiles:', error);
      showToast('Failed to load profiles', 'error');
    } finally {
      actions.setLoading(false);
    }
  };

  const refreshProfiles = async () => {
    actions.setRefreshing(true);
    try {
      const savedProfiles = await getProfiles();
      actions.setProfiles(savedProfiles);
    } catch {
      showToast('Failed to refresh profiles', 'error');
    } finally {
      actions.setRefreshing(false);
    }
  };

  const checkForNewProfiles = async () => {
    try {
      const savedProfiles = await getProfiles();
      const currentProfilesLength = state.profiles.length;

      actions.setProfiles(savedProfiles);

      if (
        currentProfilesLength > 0 &&
        savedProfiles.length > currentProfilesLength
      ) {
        const newCount = savedProfiles.length - currentProfilesLength;
        setTimeout(() => {
          showToast(
            `${newCount} new profile${
              newCount > 1 ? 's' : ''
            } saved successfully!`,
            'success',
          );
        }, 500);
      }
    } catch (error) {
      console.error('Error refreshing profiles:', error);
    }
  };

  const handleDeleteProfile = async (profile: VPNProfile) => {
    try {
      await deleteProfile(profile.id);
      const savedProfiles = await getProfiles();
      actions.setProfiles(savedProfiles);
      showToast(`Profile "${profile.name}" deleted successfully`, 'success');
    } catch {
      showToast('Failed to delete profile', 'error');
    }
  };

  // Initialize profiles on mount
  React.useEffect(() => {
    initializeProfiles();
  }, []);

  // Check for new profiles when screen comes into focus
  // Note: This runs whenever any screen using ProfilesContext comes into focus
  // Individual screens can also call refreshProfiles() directly
  useFocusEffect(
    React.useCallback(() => {
      checkForNewProfiles();
    }, []),
  );

  const value: ProfilesContextType = {
    state,
    dispatch,
    ...actions,
    deleteProfile: handleDeleteProfile,
    refreshProfiles,
    initializeProfiles,
    checkForNewProfiles,
  };

  return (
    <ProfilesContext.Provider value={value}>
      {children}
    </ProfilesContext.Provider>
  );
}

// Hook to use the profiles context
export function useProfiles(): ProfilesContextType {
  const context = useContext(ProfilesContext);
  if (context === undefined) {
    throw new Error('useProfiles must be used within a ProfilesProvider');
  }
  return context;
}

export default ProfilesContext;
