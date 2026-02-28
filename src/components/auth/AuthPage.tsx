import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, User, Upload, X, Users, Image } from 'lucide-react';

// ====== إيميل المالك — لا يتغير ======
const OWNER_EMAIL = 'njdj9985@gmail.com';

// ====== مفاتيح التخزين ======
const BG_KEY = 'site_bg_image';
const LOGO_KEY = 'site_logo_image';

type Screen = 'home' | 'login' | 'register' | 'guest';

// ====== حفظ بيانات الجلسة (الجهاز + الموقع) ======
const saveUserSession = async (userId: string) => {
  try {
    const nav = navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

    // تحديد نوع الجهاز
    const ua = navigator.userAgent;
    const deviceType = /mobile/i.test(ua) ? 'mobile' : /tablet|ipad/i.test(ua) ? 'tablet' : 'desktop';

    // تحديد نظام التشغيل
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

    // تحديد المتصفح
    let browser = 'غير معروف';
    if (/edg\//i.test(ua)) browser = 'Microsoft Edge';
    else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = 'Opera';
    else if (/chrome/i.test(ua) && !/chromium/i.test(ua)) browser = 'Google Chrome';
    else if (/firefox/i.test(ua)) browser = 'Mozilla Firefox';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/samsung/i.test(ua)) browser = 'Samsung Browser';

    // نوع الشبكة
    const networkType = conn?.effectiveType || conn?.type || 'غير معروف';

    // حجم الشاشة
    const screenSize = `${window.screen.width}x${window.screen.height}`;

    // الوقت المحلي
    const localTime = new Date().toLocaleString('ar-SA', { timeZoneName: 'short' });

    // جلب الـ IP والموقع من API مجاني
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
    } catch (_) {
      // IP API غير متاح — نكمل بدونه
    }

    await supabase.from('user_sessions').insert({
      user_id: userId,
      user_agent: ua,
      device_type: deviceType,
      os: os,
      browser: browser,
      network_type: networkType,
      screen_size: screenSize,
      local_time: localTime,
      ip_address: ip_address,
      location_city: location_city,
      location_country: location_country,
      location_lat: location_lat,
      location_lng: location_lng,
    });
  } catch (err) {
    // تجاهل الأخطاء — لا نوقف العملية بسبب الجلسة
    console.warn('saveUserSession error:', err);
  }
};

const AuthPage: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('home');

  // بيانات الدخول
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // بيانات الزائر
  const [guestName, setGuestName] = useState('');
  const [guestAge, setGuestAge] = useState('');
  const [guestGender, setGuestGender] = useState<'male' | 'female' | ''>('');

  // الخلفية والشعار — تُحمَّل من localStorage
  const [bgImage, setBgImage] = useState<string | null>(() => localStorage.getItem(BG_KEY));
  const [logoImage, setLogoImage] = useState<string | null>(() => localStorage.getItem(LOGO_KEY));

  const bgInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  // هل المستخدم الحالي هو المالك؟
  const isOwner = user?.email === OWNER_EMAIL;

  // ====== رفع الخلفية (المالك فقط) ======
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setBgImage(base64);
      localStorage.setItem(BG_KEY, base64); // حفظ دائم
      toast.success('تم تغيير الخلفية');
    };
    reader.readAsDataURL(file);
  };

  // ====== حذف الخلفية (المالك فقط) ======
  const handleRemoveBg = () => {
    setBgImage(null);
    localStorage.removeItem(BG_KEY);
    toast.success('تم حذف الخلفية');
  };

  // ====== رفع الشعار (المالك فقط) ======
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setLogoImage(base64);
      localStorage.setItem(LOGO_KEY, base64); // حفظ دائم
      toast.success('تم تغيير الشعار');
    };
    reader.readAsDataURL(file);
  };

  // ====== حذف الشعار (المالك فقط) ======
  const handleRemoveLogo = () => {
    setLogoImage(null);
    localStorage.removeItem(LOGO_KEY);
    toast.success('تم حذف الشعار');
  };

  // ====== تسجيل الدخول ======
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error, data } = await signIn(email, password);
      if (error) {
        toast.error('خطأ في تسجيل الدخول');
      } else {
        // ====== حفظ بيانات الجلسة بعد الدخول بنجاح ======
        const userId = data?.user?.id;
        if (userId) {
          saveUserSession(userId); // بدون await — لا نوقف التنقل
        }
        toast.success('مرحباً بعودتك!');
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  // ====== إنشاء حساب ======
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error, data } = await signUp(email, password, displayName);
      if (error) {
        toast.error('خطأ في إنشاء الحساب');
      } else {
        // ====== حفظ بيانات الجلسة بعد التسجيل بنجاح ======
        const userId = data?.user?.id;
        if (userId) {
          saveUserSession(userId); // بدون await — لا نوقف التنقل
        }
        toast.success('تم إنشاء حسابك بنجاح!');
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  // ====== دخول الزائر ======
  const handleGuestLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return toast.error('الرجاء إدخال الاسم');
    const age = parseInt(guestAge);
    if (!guestAge || isNaN(age) || age < 1 || age > 99) return toast.error('الرجاء إدخال عمر صحيح (1-99)');
    if (!guestGender) return toast.error('الرجاء اختيار الجنس');
    toast.success(`أهلاً ${guestName}!`);
    navigate('/');
  };

  // ====== أنماط مشتركة ======
  const inputClass = `
    w-full bg-white/5 border border-white/20 rounded-2xl px-4 py-3 text-white
    placeholder-white/40 outline-none focus:border-[#c0392b] focus:bg-white/10
    transition-all duration-300 text-right
  `;

  const btnPrimary = `
    w-full py-3 rounded-2xl font-bold text-white text-lg tracking-wide cursor-pointer
    bg-gradient-to-l from-[#c0392b] to-[#8e1a10]
    hover:from-[#e74c3c] hover:to-[#c0392b]
    shadow-[0_0_30px_rgba(192,57,43,0.4)]
    hover:shadow-[0_0_50px_rgba(231,76,60,0.6)]
    transition-all duration-300 active:scale-95
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const btnSecondary = `
    w-full py-3 rounded-2xl font-bold text-white text-lg cursor-pointer
    bg-white/10 border border-white/20
    hover:bg-white/20 hover:border-white/40
    transition-all duration-300 active:scale-95
  `;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: bgImage
          ? undefined
          : 'linear-gradient(135deg, #0a0a0a 0%, #1a0505 50%, #0a0a0a 100%)',
        backgroundImage: bgImage ? `url(${bgImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
      dir="rtl"
    >
      {/* طبقة التعتيم فوق الخلفية */}
      <div
        className="absolute inset-0"
        style={{
          background: bgImage
            ? 'linear-gradient(135deg, rgba(5,0,0,0.82) 0%, rgba(25,4,4,0.85) 50%, rgba(5,0,0,0.82) 100%)'
            : 'transparent',
        }}
      />

      {/* تأثيرات ديكور خلفية افتراضية */}
      {!bgImage && (
        <>
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #8e1a10, transparent)' }} />
          <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-15 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #c0392b, transparent)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 border border-red-800 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-5 border border-red-900 pointer-events-none" />
        </>
      )}

      {/* ====== أدوات المالك (تظهر فقط للمالك) ====== */}
      {isOwner && (
        <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
          {/* تغيير الخلفية */}
          <div className="flex gap-2">
            <button
              onClick={() => bgInputRef.current?.click()}
              className="flex items-center gap-2 bg-black/60 hover:bg-black/80 border border-white/20 text-white text-xs px-3 py-2 rounded-xl transition-all"
            >
              <Image className="w-4 h-4 text-[#e74c3c]" />
              تغيير الخلفية
            </button>
            {bgImage && (
              <button
                onClick={handleRemoveBg}
                className="flex items-center gap-1 bg-red-900/50 hover:bg-red-800/70 border border-red-700/40 text-white text-xs px-2 py-2 rounded-xl transition-all"
                title="حذف الخلفية"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* تغيير الشعار */}
          <div className="flex gap-2">
            <button
              onClick={() => logoInputRef.current?.click()}
              className="flex items-center gap-2 bg-black/60 hover:bg-black/80 border border-white/20 text-white text-xs px-3 py-2 rounded-xl transition-all"
            >
              <Upload className="w-4 h-4 text-[#e74c3c]" />
              تغيير الشعار
            </button>
            {logoImage && (
              <button
                onClick={handleRemoveLogo}
                className="flex items-center gap-1 bg-red-900/50 hover:bg-red-800/70 border border-red-700/40 text-white text-xs px-2 py-2 rounded-xl transition-all"
                title="حذف الشعار"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </div>
      )}

      {/* ====== المحتوى الرئيسي ====== */}
      <div className="relative z-10 w-full max-w-sm">

        {/* ========== الشاشة الرئيسية ========== */}
        {screen === 'home' && (
          <div className="flex flex-col items-center gap-6 animate-fadeIn">

            {/* الشعار */}
            <div className="relative">
              <div
                className="w-32 h-32 rounded-3xl flex items-center justify-center overflow-hidden"
                style={{
                  background: logoImage ? 'transparent' : 'linear-gradient(135deg, #8e1a10, #c0392b)',
                  boxShadow: '0 0 60px rgba(192,57,43,0.5)',
                }}
              >
                {logoImage ? (
                  <img src={logoImage} alt="logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl">🌩️</span>
                )}
              </div>
            </div>

            {/* الاسم */}
            <div className="text-center">
              <h1 className="text-4xl font-black text-white tracking-tight"
                style={{ textShadow: '0 0 40px rgba(192,57,43,0.8)' }}>
                شات رعود الضلام
              </h1>
              <p className="text-white/50 mt-2 text-sm">أهلاً وسهلاً بكم في أجمل شات</p>
            </div>

            {/* الأزرار */}
            <div className="w-full flex flex-col gap-3">
              <button onClick={() => setScreen('login')} className={btnPrimary}>
                دخول الأعضاء
              </button>
              <button onClick={() => setScreen('guest')} className={btnSecondary}>
                دخول الزوار
              </button>
              <button
                onClick={() => setScreen('register')}
                className="text-white/50 hover:text-white text-sm text-center transition-colors py-2"
              >
                جديد هنا؟ <span className="text-[#e74c3c] font-bold">سجل الآن</span>
              </button>
            </div>
          </div>
        )}

        {/* ========== شاشة تسجيل الدخول ========== */}
        {screen === 'login' && (
          <div className="animate-fadeIn">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
              <button onClick={() => setScreen('home')} className="text-white/40 hover:text-white text-sm mb-6 flex items-center gap-2 transition-colors">
                ← رجوع
              </button>
              <h2 className="text-2xl font-black text-white mb-6 text-center"
                style={{ textShadow: '0 0 20px rgba(192,57,43,0.6)' }}>
                تسجيل الدخول
              </h2>
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div className="relative">
                  <input
                    type="email"
                    placeholder="البريد الإلكتروني"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={inputClass}
                    required
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="كلمة المرور"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={`${inputClass} pl-12`}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button type="submit" disabled={loading} className={btnPrimary}>
                  {loading ? 'جاري الدخول...' : 'دخول'}
                </button>
              </form>
              <p className="text-center text-white/40 text-sm mt-4">
                ليس لديك حساب؟{' '}
                <button onClick={() => setScreen('register')} className="text-[#e74c3c] font-bold hover:underline">
                  إنشاء حساب
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ========== شاشة إنشاء حساب ========== */}
        {screen === 'register' && (
          <div className="animate-fadeIn">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
              <button onClick={() => setScreen('home')} className="text-white/40 hover:text-white text-sm mb-6 flex items-center gap-2 transition-colors">
                ← رجوع
              </button>
              <h2 className="text-2xl font-black text-white mb-6 text-center"
                style={{ textShadow: '0 0 20px rgba(192,57,43,0.6)' }}>
                إنشاء حساب جديد
              </h2>
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="الاسم المعروض"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className={inputClass}
                    required
                  />
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                </div>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="البريد الإلكتروني"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={inputClass}
                    required
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="كلمة المرور"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={`${inputClass} pl-12`}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button type="submit" disabled={loading} className={btnPrimary}>
                  {loading ? 'جاري التسجيل...' : 'إنشاء الحساب'}
                </button>
              </form>
              <p className="text-center text-white/40 text-sm mt-4">
                لديك حساب؟{' '}
                <button onClick={() => setScreen('login')} className="text-[#e74c3c] font-bold hover:underline">
                  تسجيل الدخول
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ========== شاشة دخول الزوار ========== */}
        {screen === 'guest' && (
          <div className="animate-fadeIn">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
              <button onClick={() => setScreen('home')} className="text-white/40 hover:text-white text-sm mb-6 flex items-center gap-2 transition-colors">
                ← رجوع
              </button>
              <div className="flex flex-col items-center mb-6">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                  style={{
                    background: 'linear-gradient(135deg, #8e1a10, #c0392b)',
                    boxShadow: '0 0 30px rgba(192,57,43,0.4)',
                  }}
                >
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-black text-white"
                  style={{ textShadow: '0 0 20px rgba(192,57,43,0.6)' }}>
                  دخول الزوار
                </h2>
              </div>

              <form onSubmit={handleGuestLogin} className="flex flex-col gap-4">
                {/* الاسم */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="الاسم"
                    value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                    className={inputClass}
                    required
                  />
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                </div>

                {/* العمر */}
                <input
                  type="number"
                  placeholder="العمر (1 - 99)"
                  value={guestAge}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 99)) {
                      setGuestAge(val);
                    }
                  }}
                  min={1}
                  max={99}
                  className={inputClass}
                  required
                />

                {/* الجنس */}
                <div>
                  <p className="text-white/50 text-sm mb-2 text-right">الجنس</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setGuestGender('male')}
                      className={`flex-1 py-3 rounded-2xl font-bold text-lg transition-all duration-300 ${
                        guestGender === 'male'
                          ? 'bg-gradient-to-l from-[#1a4a8e] to-[#0e2d5c] border-2 border-blue-400 text-white shadow-[0_0_20px_rgba(30,80,180,0.5)]'
                          : 'bg-white/5 border border-white/20 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      👦 ذكر
                    </button>
                    <button
                      type="button"
                      onClick={() => setGuestGender('female')}
                      className={`flex-1 py-3 rounded-2xl font-bold text-lg transition-all duration-300 ${
                        guestGender === 'female'
                          ? 'bg-gradient-to-l from-[#8e1a60] to-[#5c0e3c] border-2 border-pink-400 text-white shadow-[0_0_20px_rgba(180,30,100,0.5)]'
                          : 'bg-white/5 border border-white/20 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      👧 أنثى
                    </button>
                  </div>
                </div>

                <button type="submit" className={btnPrimary}>
                  دخول كزائر
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ====== الأنيميشن ====== */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.35s ease forwards; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
      `}</style>
    </div>
  );
};

export default AuthPage;
