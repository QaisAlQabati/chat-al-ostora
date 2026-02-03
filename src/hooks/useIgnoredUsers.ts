import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const IGNORED_USERS_KEY = 'ignored_users';

export const useIgnoredUsers = () => {
  const { user } = useAuth();
  const [ignoredUsers, setIgnoredUsers] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadIgnoredUsers();
    }
  }, [user]);

  const loadIgnoredUsers = () => {
    try {
      const stored = localStorage.getItem(`${IGNORED_USERS_KEY}_${user?.id}`);
      if (stored) {
        setIgnoredUsers(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading ignored users:', error);
    }
  };

  const saveIgnoredUsers = (users: string[]) => {
    try {
      localStorage.setItem(`${IGNORED_USERS_KEY}_${user?.id}`, JSON.stringify(users));
      setIgnoredUsers(users);
    } catch (error) {
      console.error('Error saving ignored users:', error);
    }
  };

  const ignoreUser = (userId: string) => {
    if (!ignoredUsers.includes(userId)) {
      const updated = [...ignoredUsers, userId];
      saveIgnoredUsers(updated);
      return true;
    }
    return false;
  };

  const unignoreUser = (userId: string) => {
    const updated = ignoredUsers.filter(id => id !== userId);
    saveIgnoredUsers(updated);
    return true;
  };

  const isIgnored = (userId: string) => {
    return ignoredUsers.includes(userId);
  };

  const getIgnoredUsersWithProfiles = async () => {
    if (ignoredUsers.length === 0) return [];

    const { data } = await supabase
      .from('profiles')
      .select('user_id, display_name, profile_picture')
      .in('user_id', ignoredUsers);

    return data || [];
  };

  return {
    ignoredUsers,
    ignoreUser,
    unignoreUser,
    isIgnored,
    getIgnoredUsersWithProfiles,
  };
};

export default useIgnoredUsers;
