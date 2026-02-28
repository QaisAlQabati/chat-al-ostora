import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  email: string | null;
  profile_picture: string | null;
  cover_picture: string | null;
  bio: string;
  country: string;
  city: string;
  points: number;
  ruby: number;
  diamonds: number;
  level: number;
  experience: number;
  is_vip: boolean;
  vip_type: string | null;
  is_verified: boolean;
  is_banned: boolean;
  ban_reason: string | null;
  ban_expires_at: string | null;
  status: string;
  private_chat_setting?: string;
  private_chat_password?: string | null;
  jailed_in_room?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isOwner: boolean;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ====== حفظ بيانات الجلسة (الجهاز + الموقع) ======
const saveUserSession = async (userId: string) => {
  try {
    const nav = navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

    const ua = navigator.userAgent;

    // نوع الجهاز
    const deviceType = /mobile/i.test(ua) ? 'mobile' : /tablet|ipad/i.test(ua) ? 'tablet' : 'desktop';

    // نظام التشغيل
    let os = 'غير معروف';
    if (/windows nt 10/i.test(ua)) os = 'Windows 10/11';
    else if (/windows nt 6.3/i.test(ua)) os = 'Windows 8.1';
    else if (/windows nt 6.1/i.test(ua)) os = 'Windows 7';
    else if (/windows/i.test(ua)) os = 'Windows';
    else if (/mac os x/i.test(ua)) os = 'macOS';
    else if (/iphone os/i.test(ua)) {
      const match = ua.match(/iphone os ([\d_]+)/i);
      os = `iOS ${match ? match[1].replace(/_/g, '.') : ''}`;
    } else if (/android/i.test(ua)) {
      const match = ua.match(/android ([\d.]+)/i);
      os = `Android ${match ? match[1] : ''}`;
    } else if (/linux/i.test(ua)) os = 'Linux';

    // المتصفح
    let browser = 'غير معروف';
    if (/edg\//i.test(ua)) browser = 'Microsoft Edge';
    else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = 'Opera';
    else if (/chrome/i.test(ua) && !/chromium/i.test(ua)) browser = 'Google Chrome';
    else if (/firefox/i.test(ua)) browser = 'Mozilla Firefox';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/samsung/i.test(ua)) browser = 'Samsung Browser';

    // الشبكة
    const networkType = conn?.effectiveType || conn?.type || 'غير معروف';

    // الشاشة والوقت
    const screenSize = `${window.screen.width}x${window.screen.height}`;
    const localTime = new Date().toLocaleString('ar-SA', { timeZoneName: 'short' });

    // الـ IP والموقع
    let ip_address = null;
    let location_city = null;
    let location_country = null;
    let location_lat = null;
    let location_lng = null;

    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const geo = await res.json();
        ip_address = geo.ip || null;
        location_city = geo.city || null;
        location_country = geo.country_name || null;
        location_lat = geo.latitude || null;
        location_lng = geo.longitude || null;
      }
    } catch (_) {}

    await supabase.from('user_sessions').insert({
      user_id: userId,
      user_agent: ua,
      device_type: deviceType,
      os,
      browser,
      network_type: networkType,
      screen_size: screenSize,
      local_time: localTime,
      ip_address,
      location_city,
      location_country,
      location_lat,
      location_lng,
    });
  } catch (err) {
    console.warn('saveUserSession error:', err);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (data && !error) {
      setProfile(data as Profile);
      setIsOwner(data.email === 'njdj9985@gmail.com');
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid potential race conditions
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
          setIsOwner(false);
        }
        setLoading(false);
      }
    );

    // Then get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    });
    // ====== حفظ الجلسة بعد التسجيل ======
    if (!error && data?.user?.id) {
      saveUserSession(data.user.id);
    }
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    // ====== حفظ الجلسة بعد الدخول ======
    if (!error && data?.user?.id) {
      saveUserSession(data.user.id);
    }
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsOwner(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isOwner,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
