import { useEffect, useRef, useState, useCallback } from 'react';
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useRoomMics } from '@/hooks/useRoomMics';
import { useVoiceChat } from '@/hooks/useVoiceChat'; // ✅ أضفنا هذا
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft, Send, Settings, Users, UserPlus, Home,
  MoreVertical, Trash2, Pin, Youtube, Smile, Image, Mic, Layers,
  Hand, X, Reply, Play, Pause, Radio, Volume2, VolumeX, SkipForward, SkipBack,
  Plus, Pencil, FolderPlus, Music, ChevronDown, ChevronUp, ImagePlus
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import RoomSettingsModal from '@/components/rooms/RoomSettingsModal';
import MicSlotsDisplay from '@/components/rooms/MicSlotsDisplay';
import MicSettingsModal from '@/components/rooms/MicSettingsModal';
import MicRequestsModal from '@/components/rooms/MicRequestsModal';
import OnlineUsersSidebar from '@/components/chat/OnlineUsersSidebar';
import YouTubePlayer from '@/components/chat/YouTubePlayer';
import UserProfileModal from '@/components/profile/UserProfileModal';
import RoomSwitcher from '@/components/rooms/RoomSwitcher';

// =====================================================================
// ⚙️  إعدادات الإيموجيات المخصصة — غيّر المسار والامتداد هنا فقط
// =====================================================================
const SMILIES_PATH = '/smilies/';
const SMILIES_EXT  = '.gif';
const SMILIES_MAX_NUM = 500;

const parseSmilies = (text: string): React.ReactNode[] => {
  const regex = /:([^\s:]+):/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const code = match[1];
    const src = `${SMILIES_PATH}${code}${SMILIES_EXT}`;
    parts.push(
      <img key={`${match.index}-${code}`} src={src} alt={`:${code}:`} title={`:${code}:`}
        className="inline-block align-middle"
        style={{ width: 28, height: 28, objectFit: 'contain', margin: '0 2px' }}
        onError={(e) => { const span = document.createElement('span'); span.textContent = `:${code}:`; (e.target as HTMLImageElement).replaceWith(span); }}
      />
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : [text];
};

// =====================================================================
// 🎬  YouTube URL Detection Helper
// =====================================================================
const YT_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[^\s]*)?/g;
const extractYtId = (url: string): string | null => { const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : null; };
const isYouTubeUrl = (text: string): boolean => { YT_REGEX.lastIndex = 0; return YT_REGEX.test(text); };

const YouTubeMiniCard: React.FC<{ url: string; onOpenMini: (url: string) => void }> = ({ url, onOpenMini }) => {
  const ytId = extractYtId(url);
  if (!ytId) return <a href={url} target="_blank" rel="noreferrer" className="text-blue-400 underline text-xs break-all">{url}</a>;
  const thumb = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
  return (
    <div className="mt-1.5 rounded-xl overflow-hidden cursor-pointer group relative" style={{ maxWidth: 220 }} onClick={() => onOpenMini(url)}>
      <div className="relative">
        <img src={thumb} alt="YouTube" className="w-full object-cover rounded-xl" style={{ aspectRatio: '16/9' }} />
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all rounded-xl flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>
      </div>
      <div className="absolute bottom-1 right-2 flex items-center gap-1">
        <Youtube className="w-3 h-3 text-red-400" />
        <span className="text-[9px] text-white/70">YouTube</span>
      </div>
    </div>
  );
};

const YTMiniPlayer: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => {
  const ytId = extractYtId(url);
  if (!ytId) return null;
  const embedUrl = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[300] bg-black border-t border-white/10 shadow-2xl" style={{ animation: 'slideUp 0.25s ease' }}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0e0e1c]">
        <div className="flex items-center gap-2">
          <Youtube className="w-4 h-4 text-red-500" />
          <span className="text-white/70 text-xs">يُشغَّل الآن</span>
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all"><X className="w-4 h-4" /></button>
      </div>
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
        <iframe src={embedUrl} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} />
      </div>
    </div>
  );
};

// =====================================================================
// ⌨️  Smilies Picker
// =====================================================================
const NAMED_SMILIES: { code: string; label: string }[] = [
  { code: 'اسمع الكلام', label: 'اسمع' }, { code: 'ضحكة', label: 'ضحكة' },
  { code: 'حب', label: 'حب' }, { code: 'بكاء', label: 'بكاء' },
  { code: 'غضب', label: 'غضب' }, { code: 'تفكير', label: 'تفكير' },
  { code: 'نوم', label: 'نوم' }, { code: 'تصفيق', label: 'تصفيق' },
  { code: 'وردة', label: 'وردة' }, { code: 'قلب', label: 'قلب' },
];
const NUMBERED_SMILIES_SHOWN = Array.from({ length: 50 }, (_, i) => i + 1);

const SmileyPicker: React.FC<{ onSelect: (code: string) => void; onClose: () => void }> = ({ onSelect, onClose }) => {
  const [tab, setTab] = useState<'numbered' | 'named'>('numbered');
  const [search, setSearch] = useState('');
  const numberedFiltered = NUMBERED_SMILIES_SHOWN.filter(n => search === '' || String(n).includes(search));
  const namedFiltered = NAMED_SMILIES.filter(s => search === '' || s.code.includes(search) || s.label.includes(search));
  return (
    <div className="absolute bottom-12 right-0 z-50 bg-[#12121f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden" style={{ width: 300, maxHeight: 360 }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
        <span className="text-white text-xs font-bold">😊 الإيموجيات المخصصة</span>
        <button onClick={onClose} className="text-white/50 hover:text-white"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex border-b border-white/10">
        <button onClick={() => setTab('numbered')} className={`flex-1 py-1.5 text-xs font-bold transition-colors ${tab === 'numbered' ? 'text-white bg-white/10' : 'text-white/40 hover:text-white'}`}>🔢 رقمية (1 → {SMILIES_MAX_NUM})</button>
        <button onClick={() => setTab('named')} className={`flex-1 py-1.5 text-xs font-bold transition-colors ${tab === 'named' ? 'text-white bg-white/10' : 'text-white/40 hover:text-white'}`}>🔤 مُسمّاة</button>
      </div>
      <div className="px-2 py-1.5 border-b border-white/10">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === 'numbered' ? 'ابحث برقم...' : 'ابحث باسم...'} className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs outline-none focus:border-white/30" dir="rtl" />
      </div>
      <div className="p-2 overflow-y-auto" style={{ maxHeight: 240 }}>
        {tab === 'numbered' ? (
          <div className="grid grid-cols-8 gap-1">
            {numberedFiltered.map(n => (
              <button key={n} onClick={() => onSelect(String(n))} className="flex flex-col items-center gap-0.5 p-1 rounded-lg hover:bg-white/10 transition-all group" title={`:${n}:`}>
                <img src={`${SMILIES_PATH}${n}${SMILIES_EXT}`} alt={`:${n}:`} style={{ width: 26, height: 26, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                <span className="text-[9px] text-white/30 group-hover:text-white/60">{n}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-1">
            {namedFiltered.map(s => (
              <button key={s.code} onClick={() => onSelect(s.code)} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-white/10 transition-all group" title={`:${s.code}:`}>
                <img src={`${SMILIES_PATH}${s.code}${SMILIES_EXT}`} alt={`:${s.code}:`} style={{ width: 28, height: 28, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                <span className="text-[9px] text-white/40 group-hover:text-white/70 truncate w-full text-center">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="px-3 py-1.5 border-t border-white/10 text-[10px] text-white/30 text-center">
        اكتب <span className="text-white/60 font-mono">:رقم:</span> أو <span className="text-white/60 font-mono">:اسم:</span> مباشرة في الرسالة
      </div>
    </div>
  );
};

// ===================== EMOJI CATEGORIES (Standard) =====================
const EMOJI_CATEGORIES: Record<string, string[]> = {
  '😀 تعابير': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','💫','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  '👋 أيدي': ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🦷','🦴','👀','👁️','👅','👄'],
  '❤️ قلوب': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','💋','🫀','🩸','💊','🩹'],
  '🎉 احتفال': ['🎉','🎊','🎈','🎀','🎁','🎗️','🏆','🥇','🥈','🥉','🏅','🎖️','🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🎷','🎸','🎹','🎺','🎻','🪕','🥁','🪘','🎙️'],
  '🐶 حيوانات': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🦆','🐦','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🐙','🦑','🦐','🦀','🐡','🐠','🐟','🐬','🐳','🦈','🐊','🐘','🦒','🐕','🐈','🐓','🦜','🐇','🐿️','🦔'],
  '🍎 طعام': ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🥪','🌮','🌯','🥗','🥘','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🍤','🍙','🍚','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🍯','🧃','🥤','🧋','☕','🍵','🍺','🍻','🥂','🍷','🥃','🍸','🍹'],
  '⚽ رياضة': ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🏋️','🤼','🤸','⛹️','🤺','🏊','🚵','🏇','🧘','🏄','🧗','🚴'],
  '🚗 مواصلات': ['🚗','🚕','🚙','🚌','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚜','🛵','🏍️','🚲','🛴','✈️','🚀','🛸','⛵','🚢','🚂','🚄','🚇','🚁','🛥️','⛽','🚦','🚥','🛑'],
  '🌍 طبيعة': ['🌍','🌎','🌏','🌋','⛰️','🏔️','🏕️','🏖️','🏜️','🏝️','🌅','🌄','🌠','🎆','🌇','🌆','🏙️','🌃','🌌','🌉','⛅','🌤️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🌬️','💨','🌀','🌈','☔','⚡','🌊','💧','💦','🔥','🌙','☀️','🌞','⭐','🌟','💫','✨','🍀','🌿','🌱','🌾','🍃','🍂','🍁','🌻','🌸','🌹','🥀','🌺','🌼','🌷'],
  '💎 أشياء': ['💎','💍','👑','💰','💵','💸','💳','🔑','🗝️','🔐','🔒','🔓','🔨','⛏️','🔧','🔩','⚙️','🔫','💣','🗡️','⚔️','🛡️','🔮','🧿','🧸','🖼️','🧵','🧶','🔗','📎','✂️','🔭','🔬','💊','💉','🩹','🧬','🔋','🔌','💡','🔦','🕯️','📱','💻','🖥️','📷','📸','📹','🎥','📺','📻','📡','📚','📖','📰','📝','✏️','🖊️','📌','📍','🗺️'],
};

// ===================== ROLE BADGES =====================
const ROLE_BADGES: Record<string, { icon: string; color: string; anim: string }> = {
  owner:        { icon: '🏆', color: '#FFD700', anim: 'animGold' },
  super_owner:  { icon: '⚜️', color: '#00BFFF', anim: 'animBlue' },
  super_admin:  { icon: '👑', color: '#FF6B00', anim: 'animSpin' },
  admin:        { icon: '⭐', color: '#FFA500', anim: 'animFlash' },
  moderator:    { icon: '🛡️', color: '#2ECC71', anim: 'animGreen' },
  vip:          { icon: '💫', color: '#F39C12', anim: 'animFloat' },
  user:         { icon: '', color: '', anim: '' },
};

// أسماء الرتب بالعربي
const ROLE_NAMES_AR: Record<string, string> = {
  owner: 'المالك', super_owner: 'المالك الأعلى', super_admin: 'سوبر أدمن',
  admin: 'مشرف', moderator: 'مراقب', vip: 'VIP',
};

// ===================== USER SETTINGS TYPE =====================
interface UserChatSettings {
  name_color: string;
  font_color: string;
  name_bg_color: string;
  name_glow: boolean;
  name_glow_color: string;
  name_effect: 'none' | 'fish' | 'hearts' | 'stars';
  role_icons?: Record<string, string>;
}

// =====================================================================
// 💾  localStorage helpers — أيقونات الرتب تحفظ للأبد
// =====================================================================
const ROLE_ICONS_STORAGE_KEY = 'role_icons_v1';
const loadRoleIconsFromStorage = (userId: string): Record<string, string> => {
  try { const raw = localStorage.getItem(`${ROLE_ICONS_STORAGE_KEY}_${userId}`); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
};
const saveRoleIconsToStorage = (userId: string, icons: Record<string, string>) => {
  try { localStorage.setItem(`${ROLE_ICONS_STORAGE_KEY}_${userId}`, JSON.stringify(icons)); } catch {}
};


// =====================================================================
// 🎖️  مودال تغيير أيقونة الرتبة
// =====================================================================
const RoleIconModal: React.FC<{
  userId: string;
  userRoles: string[];
  onClose: () => void;
  onIconUpdated: (role: string, url: string | null) => void;
}> = ({ userId, userRoles, onClose, onIconUpdated }) => {
  const [selectedRole, setSelectedRole] = useState(userRoles[0] || '');
  const [currentIcons, setCurrentIcons] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const localIcons = loadRoleIconsFromStorage(userId);
    if (Object.keys(localIcons).length > 0) setCurrentIcons(localIcons);
    supabase.from('user_settings').select('role_icons').eq('user_id', userId).maybeSingle().then(({ data }) => {
      if (data?.role_icons) {
        const merged = { ...localIcons, ...(data.role_icons as Record<string, string>) };
        setCurrentIcons(merged);
        saveRoleIconsToStorage(userId, merged);
      }
    });
  }, [userId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRole) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('الصورة كبيرة جداً (الحد 2MB)'); return; }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `role-icons/${userId}_${selectedRole}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('chat-media').upload(path, file);
    if (error) { toast.error('فشل رفع الصورة'); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(path);
    const newUrl = urlData.publicUrl;
    const newIcons = { ...currentIcons, [selectedRole]: newUrl };
    await supabase.from('user_settings').upsert({ user_id: userId, role_icons: newIcons }, { onConflict: 'user_id' });
    setCurrentIcons(newIcons);
    saveRoleIconsToStorage(userId, newIcons);
    onIconUpdated(selectedRole, newUrl);
    toast.success('✅ تم تغيير أيقونة الرتبة! تظهر فوراً في الدردشة');
    setUploading(false);
    e.target.value = '';
  };

  const handleReset = async (role: string) => {
    const newIcons = { ...currentIcons };
    delete newIcons[role];
    await supabase.from('user_settings').upsert({ user_id: userId, role_icons: newIcons }, { onConflict: 'user_id' });
    setCurrentIcons(newIcons);
    saveRoleIconsToStorage(userId, newIcons);
    onIconUpdated(role, null);
    toast.success('تم إعادة تعيين الأيقونة للافتراضي');
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70" style={{ animation: 'popIn 0.2s ease' }}>
      <div className="bg-[#12121f] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ width: 'min(400px, 95vw)', maxHeight: '85vh' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ImagePlus className="w-4 h-4 text-purple-400" />
            <span className="text-white font-bold text-sm">تغيير أيقونة الرتبة</span>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <p className="text-white/50 text-xs text-center" dir="rtl">اختر رتبتك وارفع صورة أو GIF لتحل محل الإيموجي في الدردشة</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {userRoles.map(role => (
              <button key={role} onClick={() => setSelectedRole(role)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedRole === role ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
                {currentIcons[role]
                  ? <img src={currentIcons[role]} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
                  : <span>{ROLE_BADGES[role]?.icon}</span>}
                <span>{ROLE_NAMES_AR[role] || role}</span>
              </button>
            ))}
          </div>
          {selectedRole && (
            <div className="bg-white/5 rounded-xl p-4 flex flex-col items-center gap-3">
              <p className="text-white/40 text-xs">الأيقونة الحالية لـ "{ROLE_NAMES_AR[selectedRole] || selectedRole}"</p>
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                {currentIcons[selectedRole]
                  ? <img src={currentIcons[selectedRole]} alt="" className="w-full h-full object-contain" />
                  : <span style={{ fontSize: 32 }}>{ROLE_BADGES[selectedRole]?.icon}</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl px-3 py-2 text-xs font-bold transition-all disabled:opacity-50">
                  {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><ImagePlus className="w-4 h-4" /><span>رفع صورة أو GIF لـ "{ROLE_NAMES_AR[selectedRole] || selectedRole}"</span></>}
                </button>
                {currentIcons[selectedRole] && (
                  <button onClick={() => handleReset(selectedRole)}
                    className="flex items-center gap-1 bg-red-900/30 hover:bg-red-900/60 text-red-400 rounded-xl px-3 py-2 text-xs font-bold transition-all">
                    <X className="w-3.5 h-3.5" /><span>إعادة تعيين</span>
                  </button>
                )}
              </div>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*,.gif" className="hidden" onChange={handleUpload} />
          <p className="text-white/30 text-[10px] text-center">PNG, JPG, GIF متحرك — الحد 2MB</p>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// 🎖️  مكوّن عرض أيقونة الرتبة في الرسالة — حجم أكبر للأيقونة المخصصة
// =====================================================================
const RoleBadgeIcon: React.FC<{ role: string; settings: Partial<UserChatSettings> | null }> = ({ role, settings }) => {
  const badge = ROLE_BADGES[role || 'user'];
  const customIconUrl = settings?.role_icons?.[role];
  if (!badge?.icon && !customIconUrl) return null;
  if (customIconUrl) {
    return (
      <span className="flex-shrink-0 w-7 flex items-center justify-center mt-[3px]">
        <img src={customIconUrl} alt={role} style={{ width: 26, height: 26, objectFit: 'contain', display: 'inline-block', borderRadius: 4 }} />
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 w-5 flex items-center justify-center mt-[5px]">
      <span style={{ animation: `${badge.anim} 2s ease-in-out infinite`, display: 'inline-block', fontSize: '14px', lineHeight: 1 }}>
        {badge.icon}
      </span>
    </span>
  );
};

// ===================== ANIMATED NAME EFFECT =====================
const AnimatedNameEffect: React.FC<{ effect: UserChatSettings['name_effect'] }> = ({ effect }) => {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; scale: number }[]>([]);
  useEffect(() => {
    if (effect === 'none') return;
    let counter = 0;
    const interval = setInterval(() => {
      counter++;
      const angle = Math.random() * 360;
      const distance = 18 + Math.random() * 22;
      setParticles(prev => [...prev.slice(-6), { id: counter, x: Math.cos((angle * Math.PI) / 180) * distance, y: Math.sin((angle * Math.PI) / 180) * distance, scale: 0.5 + Math.random() * 0.7 }]);
    }, 500);
    return () => clearInterval(interval);
  }, [effect]);
  if (effect === 'none') return null;
  const emoji = effect === 'fish' ? '🐟' : effect === 'hearts' ? '💗' : '✨';
  return (
    <span className="relative inline-block pointer-events-none select-none w-0 h-0 overflow-visible">
      {particles.map(p => (
        <span key={p.id} className="absolute animate-ping"
          style={{ left: `${p.x}px`, top: `${p.y}px`, transform: `translate(-50%, -50%) scale(${p.scale})`, animationDuration: '0.9s', animationIterationCount: '1', fontSize: '9px', lineHeight: 1 }}>
          {emoji}
        </span>
      ))}
    </span>
  );
};

// ===================== STYLED USERNAME =====================
const StyledUsername: React.FC<{ name: string; settings: Partial<UserChatSettings> | null; isMine: boolean; badgeColor?: string }> = ({ name, settings, isMine, badgeColor }) => {
  const nameColor = settings?.name_color || badgeColor || (isMine ? '#a78bfa' : '#94a3b8');
  const bgColor = settings?.name_bg_color && settings.name_bg_color !== 'transparent' ? settings.name_bg_color : undefined;
  const glowStyle = settings?.name_glow ? { textShadow: `0 0 6px ${settings.name_glow_color || '#a78bfa'}, 0 0 14px ${settings.name_glow_color || '#a78bfa'}` } : {};
  return (
    <span className="relative inline-flex items-center">
      <span className="text-[11px] font-bold flex-shrink-0 px-0.5 rounded" style={{ color: nameColor, backgroundColor: bgColor, ...glowStyle, transition: 'all 0.3s' }}>{name}</span>
      <AnimatedNameEffect effect={settings?.name_effect || 'none'} />
    </span>
  );
};

interface Message {
  id: string; content: string; message_type: string; created_at: string; sender_id: string;
  media_url?: string | null; reply_to_id?: string | null;
  reply_to?: { content: string; sender_display_name: string } | null;
  sender?: { display_name: string; profile_picture: string | null; is_verified: boolean; is_vip: boolean; vip_type: string | null; };
  senderRole?: string;
  senderSettings?: Partial<UserChatSettings> | null;
}

// ===================== JOIN NOTIFICATION TYPE =====================
interface JoinNotification { id: string; type: 'join'; display_name: string; created_at: string; }
type ChatItem = Message | JoinNotification;
const isJoinNotification = (item: ChatItem): item is JoinNotification => (item as JoinNotification).type === 'join';

interface Room {
  id: string; name: string; description: string | null; icon: string;
  background_url: string | null; background_color: string;
  welcome_message: string | null; pinned_message: string | null; created_by: string; is_pinned: boolean;
}
interface Member { user_id: string; role: string; is_muted: boolean; is_banned: boolean; }
const MESSAGES_PER_PAGE = 30;

// =====================================================================
// 📻  Radio Player
// =====================================================================
interface RadioSong { id: string; title: string; url: string; }
interface RadioFolder { id: string; name: string; songs: RadioSong[]; }
const RADIO_STORAGE_KEY = 'radio_folders_v1';
const loadRadioFromStorage = (): RadioFolder[] => { try { const raw = localStorage.getItem(RADIO_STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; } };
const saveRadioToStorage = (folders: RadioFolder[]) => { try { localStorage.setItem(RADIO_STORAGE_KEY, JSON.stringify(folders)); } catch {} };

const RadioEditor: React.FC<{ folders: RadioFolder[]; onSave: (folders: RadioFolder[]) => void; onClose: () => void }> = ({ folders: initialFolders, onSave, onClose }) => {
  const [folders, setFolders] = useState<RadioFolder[]>(initialFolders);
  const [newFolderName, setNewFolderName] = useState('');
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [newSongTitle, setNewSongTitle] = useState('');
  const [newSongUrl, setNewSongUrl] = useState('');
  const addFolder = () => { if (!newFolderName.trim()) return; setFolders(prev => [...prev, { id: Date.now().toString(), name: newFolderName.trim(), songs: [] }]); setNewFolderName(''); };
  const deleteFolder = (id: string) => setFolders(prev => prev.filter(f => f.id !== id));
  const addSong = (folderId: string) => {
    if (!newSongTitle.trim() || !newSongUrl.trim()) return;
    let url = newSongUrl.trim();
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) url = `https://www.youtube.com/watch?v=${ytMatch[1]}`;
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, songs: [...f.songs, { id: Date.now().toString(), title: newSongTitle.trim(), url }] } : f));
    setNewSongTitle(''); setNewSongUrl('');
  };
  const deleteSong = (folderId: string, songId: string) => setFolders(prev => prev.map(f => f.id === folderId ? { ...f, songs: f.songs.filter(s => s.id !== songId) } : f));
  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/70" style={{ animation: 'popIn 0.2s ease' }}>
      <div className="bg-[#12121f] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ width: 'min(480px, 95vw)', maxHeight: '88vh' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-white font-bold">✏️ تحرير الراديو</span>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          <div className="flex gap-2">
            <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addFolder()} placeholder="اسم المجلد الجديد..." dir="rtl" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-primary" />
            <button onClick={addFolder} className="bg-primary hover:bg-primary/80 text-white rounded-xl px-3 py-2 text-sm font-bold transition-all flex items-center gap-1"><FolderPlus className="w-4 h-4" /><span>إضافة</span></button>
          </div>
          {folders.map(folder => (
            <div key={folder.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/5" onClick={() => setExpandedFolder(expandedFolder === folder.id ? null : folder.id)}>
                <Music className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="flex-1 text-white text-sm font-bold">{folder.name}</span>
                <span className="text-white/30 text-xs">{folder.songs.length} أغنية</span>
                {expandedFolder === folder.id ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                <button onClick={e => { e.stopPropagation(); deleteFolder(folder.id); }} className="text-red-400/50 hover:text-red-400 p-1 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              {expandedFolder === folder.id && (
                <div className="border-t border-white/10 p-2 flex flex-col gap-2">
                  {folder.songs.map(song => (
                    <div key={song.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1.5">
                      <span className="text-xs text-white/70 flex-1 truncate" dir="rtl">{song.title}</span>
                      <button onClick={() => deleteSong(folder.id, song.id)} className="text-red-400/40 hover:text-red-400 flex-shrink-0"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <div className="flex flex-col gap-1.5 pt-1">
                    <input value={newSongTitle} onChange={e => setNewSongTitle(e.target.value)} placeholder="اسم الأغنية..." dir="rtl" className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-primary" />
                    <input value={newSongUrl} onChange={e => setNewSongUrl(e.target.value)} placeholder="رابط يوتيوب أو MP3..." dir="rtl" className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-primary" />
                    <button onClick={() => addSong(folder.id)} className="bg-white/10 hover:bg-primary text-white rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1 justify-center"><Plus className="w-3 h-3" /><span>إضافة أغنية</span></button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {folders.length === 0 && <div className="text-center text-white/30 py-8 text-sm">لا يوجد مجلدات بعد، أضف مجلداً للبدء</div>}
        </div>
        <div className="px-4 py-3 border-t border-white/10 flex justify-end gap-2">
          <button onClick={onClose} className="text-white/50 hover:text-white text-sm px-4 py-2 rounded-xl hover:bg-white/10 transition-colors">إلغاء</button>
          <button onClick={() => { onSave(folders); onClose(); }} className="bg-primary hover:bg-primary/80 text-white rounded-xl px-4 py-2 text-sm font-bold transition-all">حفظ التغييرات ✓</button>
        </div>
      </div>
    </div>
  );
};

const RadioPlayer: React.FC<{ folders: RadioFolder[]; isAppOwner: boolean; onEditRequest: () => void; onClose: () => void }> = ({ folders, isAppOwner, onEditRequest, onClose }) => {
  const [selectedFolder, setSelectedFolder] = useState<RadioFolder | null>(folders[0] || null);
  const [currentSongIdx, setCurrentSongIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [ytKey, setYtKey] = useState(0);
  const currentSong = selectedFolder?.songs[currentSongIdx] || null;
  const isYoutube = !!(currentSong?.url?.includes('youtube.com') || currentSong?.url?.includes('youtu.be'));
  const getYtId = (url: string) => { const m = url.match(/(?:v=|youtu\.be\/|embed\/)([^&?\s]{11})/); return m ? m[1] : null; };
  const getYtEmbed = (url: string) => { const id = getYtId(url); if (!id) return ''; const vol = isMuted ? 0 : Math.round(volume * 100); return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&volume=${vol}&enablejsapi=1`; };
  useEffect(() => { if (!audioRef.current) return; audioRef.current.volume = isMuted ? 0 : volume; }, [volume, isMuted]);
  useEffect(() => { setCurrentSongIdx(0); setIsPlaying(false); }, [selectedFolder?.id]);
  useEffect(() => { if (!audioRef.current || isYoutube) return; if (isPlaying) { audioRef.current.play().catch(() => setIsPlaying(false)); } else { audioRef.current.pause(); } }, [isPlaying, isYoutube]);
  useEffect(() => { if (isYoutube && isPlaying) setYtKey(k => k + 1); }, [currentSongIdx, currentSong?.url]);
  const playPause = () => setIsPlaying(p => !p);
  const next = () => { if (!selectedFolder || selectedFolder.songs.length === 0) return; setCurrentSongIdx(i => (i + 1) % selectedFolder.songs.length); setIsPlaying(true); };
  const prev = () => { if (!selectedFolder || selectedFolder.songs.length === 0) return; setCurrentSongIdx(i => (i - 1 + selectedFolder.songs.length) % selectedFolder.songs.length); setIsPlaying(true); };
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60" style={{ animation: 'popIn 0.2s ease' }}>
      <div className="w-full max-w-md bg-[#0e0e1c] border-t border-white/10 rounded-t-3xl shadow-2xl overflow-hidden" style={{ animation: 'slideUp 0.25s ease' }}>
        {isYoutube && isPlaying && currentSong && (
          <div style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
            <iframe key={ytKey} src={getYtEmbed(currentSong.url)} allow="autoplay; encrypted-media" allowFullScreen style={{ width: 1, height: 1 }} />
          </div>
        )}
        {!isYoutube && currentSong && <audio ref={audioRef} src={currentSong.url} onEnded={next} onError={() => { toast.error('تعذر تشغيل الملف'); setIsPlaying(false); }} />}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <Radio className={`w-5 h-5 text-primary ${isPlaying ? 'animate-pulse' : ''}`} />
            <span className="text-white font-bold text-sm">راديو الغرفة</span>
            {isPlaying && <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">يُعزف ♪</span>}
          </div>
          <div className="flex items-center gap-1">
            {isAppOwner && <button onClick={onEditRequest} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all" title="تحرير"><Pencil className="w-4 h-4" /></button>}
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"><X className="w-4 h-4" /></button>
          </div>
        </div>
        {isYoutube && <div className="mx-3 mb-1 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl"><p className="text-yellow-400 text-[10px] text-center">⚠️ يوتيوب قد يمنع التشغيل التلقائي — اضغط تشغيل يدوياً</p></div>}
        <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {folders.map(folder => (
            <button key={folder.id} onClick={() => setSelectedFolder(folder)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedFolder?.id === folder.id ? 'bg-primary text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>{folder.name}</button>
          ))}
          {folders.length === 0 && <span className="text-white/30 text-xs py-1.5">{isAppOwner ? 'اضغط ✏️ لإضافة مجلدات وأغاني' : 'لا يوجد محتوى بعد'}</span>}
        </div>
        {selectedFolder && selectedFolder.songs.length > 0 && (
          <div className="mx-3 mb-3 bg-white/5 rounded-2xl overflow-hidden max-h-36 overflow-y-auto">
            {selectedFolder.songs.map((song, idx) => (
              <button key={song.id} onClick={() => { setCurrentSongIdx(idx); setIsPlaying(true); }} className={`w-full flex items-center gap-2 px-3 py-2 text-right transition-colors ${idx === currentSongIdx ? 'bg-primary/20 text-primary' : 'text-white/70 hover:bg-white/10'}`}>
                <Music className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="flex-1 text-xs truncate" dir="rtl">{song.title}</span>
                {idx === currentSongIdx && isPlaying && <span className="flex gap-0.5 items-end h-3"><span className="w-0.5 bg-primary rounded-full animate-bounce" style={{ height: '60%', animationDelay: '0ms' }}/><span className="w-0.5 bg-primary rounded-full animate-bounce" style={{ height: '100%', animationDelay: '150ms' }}/><span className="w-0.5 bg-primary rounded-full animate-bounce" style={{ height: '70%', animationDelay: '300ms' }}/></span>}
              </button>
            ))}
          </div>
        )}
        <div className="px-4 py-1 text-center">
          <p className="text-white/30 text-[10px] mb-0.5">يُعزف الآن</p>
          <p className="text-white font-bold text-sm truncate" dir="rtl">{currentSong ? currentSong.title : '— اختر أغنية —'}</p>
        </div>
        <div className="flex items-center justify-center gap-5 py-3">
          <button onClick={prev} disabled={!selectedFolder || selectedFolder.songs.length <= 1} className="text-white/50 hover:text-white disabled:opacity-20 transition-colors"><SkipBack className="w-5 h-5" /></button>
          <button onClick={playPause} disabled={!currentSong} className="w-14 h-14 rounded-full bg-primary hover:bg-primary/80 text-white flex items-center justify-center disabled:opacity-30 transition-all shadow-xl shadow-primary/40 active:scale-95">{isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}</button>
          <button onClick={next} disabled={!selectedFolder || selectedFolder.songs.length <= 1} className="text-white/50 hover:text-white disabled:opacity-20 transition-colors"><SkipForward className="w-5 h-5" /></button>
        </div>
        <div className="flex items-center gap-2 px-5 pb-5">
          <button onClick={() => setIsMuted(m => !m)} className="text-white/50 hover:text-white transition-colors flex-shrink-0">{isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
          <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={e => { setVolume(Number(e.target.value)); setIsMuted(false); }} className="flex-1 accent-primary cursor-pointer" />
          <span className="text-white/40 text-xs w-7 text-center">{Math.round((isMuted ? 0 : volume) * 100)}</span>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// 🎨  Drawing Board
// =====================================================================
const DrawingBoard: React.FC<{ onSend: (blob: Blob) => void; onClose: () => void }> = ({ onSend, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'text'>('brush');
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textValue, setTextValue] = useState('');
  const [textPos, setTextPos] = useState({ x: 0, y: 0 });
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const COLORS = ['#ffffff','#000000','#ff4444','#ff8800','#ffdd00','#44ff44','#00bbff','#8844ff','#ff44aa','#44ffee','#a0522d','#888888','#ffaaaa','#aaffaa','#aaaaff'];
  const SIZES = [2, 4, 8, 14, 22];
  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
    if ('touches' in e) return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  };
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return;
    if (tool === 'text') { const pos = getPos(e, canvas); setTextPos(pos); setShowTextInput(true); setTimeout(() => textInputRef.current?.focus(), 50); return; }
    setIsDrawing(true); lastPos.current = getPos(e, canvas);
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !lastPos.current) return;
    e.preventDefault();
    const pos = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === 'eraser' ? '#1a1a2e' : color; ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); lastPos.current = pos;
  };
  const stopDraw = () => { setIsDrawing(false); lastPos.current = null; };
  const placeText = () => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !textValue.trim()) { setShowTextInput(false); setTextValue(''); return; }
    ctx.font = `bold ${brushSize * 4 + 10}px Tajawal, sans-serif`; ctx.fillStyle = color; ctx.textAlign = 'right';
    ctx.fillText(textValue, textPos.x, textPos.y); setShowTextInput(false); setTextValue('');
  };
  const loadBg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const img = new window.Image(); img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); }; img.src = ev.target?.result as string; };
    reader.readAsDataURL(file); e.target.value = '';
  };
  const clearCanvas = () => { const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return; ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, canvas.width, canvas.height); };
  const handleSend = () => { canvasRef.current?.toBlob(blob => { if (blob) onSend(blob); }, 'image/png'); };
  useEffect(() => { const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return; ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, canvas.width, canvas.height); }, []);
  const toolBtn = (t: typeof tool, icon: React.ReactNode, label: string) => (
    <button onClick={() => { setTool(t); setShowTextInput(false); }} title={label} className={`p-1.5 rounded-lg transition-all ${tool === t ? 'bg-primary text-white' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}>{icon}</button>
  );
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70" style={{ animation: 'popIn 0.2s ease' }}>
      <div className="bg-[#12121f] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ width: 'min(520px, 96vw)', maxHeight: '92vh' }}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
          <span className="text-white font-bold text-sm">🎨 لوحة الرسم</span>
          <button onClick={onClose} className="text-white/50 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-1 px-3 py-2 border-b border-white/10 flex-wrap">
          <div className="flex gap-0.5 bg-white/5 rounded-lg p-0.5">
            {toolBtn('brush', <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21l7-7m4-10L7 11l6 6 7-7-7-7z"/></svg>, 'فرشاة')}
            {toolBtn('eraser', <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 20H7L3 16l10-10 7 7-3.5 3.5"/></svg>, 'ممحاة')}
            {toolBtn('text', <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>, 'نص')}
          </div>
          <div className="flex gap-0.5 bg-white/5 rounded-lg p-0.5">
            {SIZES.map(s => (
              <button key={s} onClick={() => setBrushSize(s)} className={`rounded-md flex items-center justify-center transition-all ${brushSize === s ? 'bg-primary' : 'hover:bg-white/10'}`} style={{ width: 26, height: 26 }} title={`حجم ${s}`}>
                <div className="rounded-full bg-current" style={{ width: s + 2, height: s + 2, opacity: brushSize === s ? 1 : 0.4 }} />
              </button>
            ))}
          </div>
          <button onClick={() => bgInputRef.current?.click()} className="p-1.5 rounded-lg text-white/50 hover:bg-white/10 hover:text-blue-400 transition-all" title="رفع صورة خلفية"><Image className="w-4 h-4" /></button>
          <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={loadBg} />
          <button onClick={clearCanvas} className="p-1.5 rounded-lg text-white/50 hover:bg-red-900/30 hover:text-red-400 transition-all" title="مسح الكل"><Trash2 className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-1 px-3 py-2 border-b border-white/10 flex-wrap">
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} className={`rounded-full transition-all ${color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-[#12121f] scale-125' : 'hover:scale-110'}`} style={{ width: 20, height: 20, background: c, border: c === '#000000' ? '1px solid #444' : 'none' }} />
          ))}
          <label title="لون مخصص" className="relative cursor-pointer">
            <div className="w-5 h-5 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center text-[10px] text-white/50 hover:border-white transition-all overflow-hidden">
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />+
            </div>
          </label>
          <div className="w-6 h-6 rounded-full border border-white/20 mr-1" style={{ background: color }} />
        </div>
        <div className="relative flex-1 overflow-hidden" style={{ minHeight: 260 }}>
          <canvas ref={canvasRef} width={480} height={320} className="w-full h-full"
            style={{ touchAction: 'none', cursor: tool === 'eraser' ? 'cell' : tool === 'text' ? 'text' : 'crosshair', display: 'block' }}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
          {showTextInput && (
            <div className="absolute" style={{ left: textPos.x / (480 / (canvasRef.current?.clientWidth || 480)), top: textPos.y / (320 / (canvasRef.current?.clientHeight || 320)) }}>
              <input ref={textInputRef} value={textValue} onChange={e => setTextValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') placeText(); if (e.key === 'Escape') { setShowTextInput(false); setTextValue(''); } }}
                className="bg-black/60 border border-white/30 rounded px-2 py-0.5 text-white text-sm outline-none"
                style={{ color, minWidth: 80, direction: 'rtl' }} placeholder="اكتب ثم Enter..." />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/10">
          <span className="text-white/30 text-xs">اضغط Enter لوضع النص • اسحب للرسم</span>
          <button onClick={handleSend} className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white rounded-xl px-4 py-1.5 text-sm font-bold transition-all"><Send className="w-3.5 h-3.5" /><span>إرسال</span></button>
        </div>
      </div>
    </div>
  );
};

// ===================== STANDARD EMOJI PICKER =====================
const EmojiPicker: React.FC<{ onSelect: (e: string) => void; onClose: () => void }> = ({ onSelect, onClose }) => {
  const [cat, setCat] = useState(Object.keys(EMOJI_CATEGORIES)[0]);
  return (
    <div className="absolute bottom-12 right-0 z-50 bg-[#12121f] border border-white/10 rounded-2xl shadow-2xl w-72 overflow-hidden" style={{ maxHeight: 340 }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
        <span className="text-white text-xs font-bold">الإيموجيات</span>
        <button onClick={onClose} className="text-white/50 hover:text-white"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex gap-0.5 px-1.5 py-1 overflow-x-auto border-b border-white/10" style={{ scrollbarWidth: 'none' }}>
        {Object.keys(EMOJI_CATEGORIES).map(c => (
          <button key={c} onClick={() => setCat(c)} className={`text-base px-1.5 py-0.5 rounded-lg flex-shrink-0 transition-all ${cat === c ? 'bg-white/20' : 'hover:bg-white/10'}`}>{c.split(' ')[0]}</button>
        ))}
      </div>
      <div className="p-1.5 overflow-y-auto" style={{ maxHeight: 230 }}>
        <div className="grid grid-cols-9 gap-0.5">
          {EMOJI_CATEGORIES[cat].map((emoji) => (
            <button key={emoji} onClick={() => onSelect(emoji)} className="text-lg hover:bg-white/10 rounded-lg p-0.5 transition-all hover:scale-125">{emoji}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ===================== AUDIO RECORDER =====================
const AudioRecorder: React.FC<{ onSend: (blob: Blob) => void; onCancel: () => void }> = ({ onSend, onCancel }) => {
  const [seconds, setSeconds] = useState(0);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const mr = new MediaRecorder(stream); mrRef.current = mr;
      mr.ondataavailable = e => chunks.current.push(e.data); mr.start();
      timer.current = setInterval(() => setSeconds(s => s + 1), 1000);
    }).catch(() => { toast.error('تعذر الوصول للميكروفون'); onCancel(); });
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);
  const stop = (send: boolean) => {
    if (timer.current) clearInterval(timer.current);
    const mr = mrRef.current; if (!mr) return;
    mr.onstop = () => { const blob = new Blob(chunks.current, { type: 'audio/webm' }); mr.stream.getTracks().forEach(t => t.stop()); if (send) onSend(blob); else onCancel(); };
    mr.stop();
  };
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return (
    <div className="flex items-center gap-2 flex-1 bg-red-900/30 border border-red-500/30 rounded-2xl px-3 py-1.5">
      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
      <span className="text-red-400 font-mono text-xs">{fmt(seconds)}</span>
      <span className="text-white/50 text-xs flex-1">جاري التسجيل...</span>
      <button onClick={() => stop(false)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
      <button onClick={() => stop(true)} className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-2.5 py-0.5 text-xs font-bold">إرسال</button>
    </div>
  );
};

// ===================== AUDIO PLAYER =====================
const AudioPlayer: React.FC<{ url: string }> = ({ url }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const toggle = () => { if (!audioRef.current) return; if (playing) { audioRef.current.pause(); setPlaying(false); } else { audioRef.current.play(); setPlaying(true); } };
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  return (
    <div className="flex items-center gap-2 bg-white/5 rounded-xl px-2.5 py-1.5 min-w-[150px] max-w-[190px]">
      <audio ref={audioRef} src={url} onTimeUpdate={() => setProgress(audioRef.current?.currentTime || 0)} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} onEnded={() => { setPlaying(false); setProgress(0); }} />
      <button onClick={toggle} className="text-white hover:text-primary flex-shrink-0">{playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</button>
      <div className="flex-1 min-w-0">
        <div className="h-1 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }} /></div>
        <span className="text-[9px] text-white/30 mt-0.5 block">{fmt(progress)} / {fmt(duration)}</span>
      </div>
    </div>
  );
};

// ===================== JOIN NOTIFICATION ITEM =====================
const JoinNotificationItem: React.FC<{ notification: JoinNotification }> = ({ notification }) => (
  <div className="flex items-center justify-center py-[3px] px-2" dir="rtl">
    <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-0.5">
      <span className="text-green-400 text-[10px]">🟢</span>
      <span className="text-green-400 font-bold text-[11px]">{notification.display_name}</span>
      <span className="text-green-300/60 text-[10px]">: انضم للغرفة (#)</span>
    </div>
  </div>
);

// ===================== MESSAGE ITEM =====================
const ChatMessageItem: React.FC<{
  message: Message; currentUserId: string; currentUserDisplayName: string;
  isModOrOwner: boolean; onReply: (msg: Message) => void; onDelete: (id: string) => void;
  onMention: (name: string) => void; onOpenProfile: (uid: string) => void; onOpenMiniYt: (url: string) => void;
}> = ({ message, currentUserId, currentUserDisplayName, isModOrOwner, onReply, onDelete, onMention, onOpenProfile, onOpenMiniYt }) => {
  const isMine = message.sender_id === currentUserId;
  const badge = ROLE_BADGES[message.senderRole || 'user'];
  const name = message.sender?.display_name || 'مجهول';
  const canDelete = isMine || isModOrOwner;
  const userSettings = message.senderSettings;

  const renderContent = (text: string) => {
    const mentionParts = text.split(/(@\[[^\]]+\])/g);
    const result: React.ReactNode[] = [];
    mentionParts.forEach((part, i) => {
      const mentionMatch = part.match(/^@\[([^\]]+)\]$/);
      if (mentionMatch) {
        const n = mentionMatch[1];
        result.push(<span key={`m-${i}`} className={`font-bold ${n === currentUserDisplayName ? 'text-yellow-400' : 'text-blue-400'}`}>@{n}</span>);
      } else {
        const smileyNodes = parseSmilies(part);
        smileyNodes.forEach((node, j) => result.push(<React.Fragment key={`s-${i}-${j}`}>{node}</React.Fragment>));
      }
    });
    return result;
  };

  const messageTextColor = userSettings?.font_color || 'rgba(255,255,255,0.85)';

  return (
    <div className="group flex items-start gap-1 px-2 py-[1px] hover:bg-white/[0.04] rounded-md transition-all w-full" dir="rtl">
      <RoleBadgeIcon role={message.senderRole || 'user'} settings={userSettings || null} />
      <button onClick={() => onOpenProfile(message.sender_id)} className="flex-shrink-0 mt-[4px]">
        <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
          {message.sender?.profile_picture
            ? <img src={message.sender.profile_picture} alt="" className="w-full h-full object-cover" />
            : <span className="text-[10px] text-white/60">{name.charAt(0)}</span>}
        </div>
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap leading-snug">
          <button onClick={() => onMention(name)} className="hover:opacity-80 transition-opacity flex-shrink-0">
            <StyledUsername name={name} settings={userSettings || null} isMine={isMine} badgeColor={badge.color} />
            {message.sender?.is_verified && <span className="text-blue-400 text-[9px] mr-0.5">✓</span>}
          </button>
          {(message.message_type === 'text' || !message.message_type) && (
            <span className="text-[13px] break-words min-w-0 leading-relaxed" style={{ color: messageTextColor }}>{renderContent(message.content)}</span>
          )}
          <span className="text-[9px] text-white/20 flex-shrink-0 self-end leading-none">{new Date(message.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        {message.reply_to && (
          <div className="bg-white/5 border-r-2 border-primary/40 rounded px-2 py-0.5 mt-0.5 max-w-xs">
            <p className="text-[10px] text-primary/70 font-bold truncate">{message.reply_to.sender_display_name}</p>
            <p className="text-[10px] text-white/40 truncate">{message.reply_to.content}</p>
          </div>
        )}
        {message.message_type === 'image' && message.media_url && (
          <img src={message.media_url} alt="" className="rounded-xl mt-1 max-w-[150px] max-h-[150px] object-cover cursor-pointer" onClick={() => window.open(message.media_url!, '_blank')} />
        )}
        {message.message_type === 'audio' && message.media_url && <div className="mt-1"><AudioPlayer url={message.media_url} /></div>}
        {message.message_type === 'youtube' && message.media_url && <YouTubeMiniCard url={message.media_url} onOpenMini={onOpenMiniYt} />}
        {message.message_type === 'youtube_auto' && message.media_url && <YouTubeMiniCard url={message.media_url} onOpenMini={onOpenMiniYt} />}
      </div>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 self-center">
        <button onClick={() => onReply(message)} className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/40 hover:text-white" title="رد"><Reply className="w-3 h-3" /></button>
        {canDelete && <button onClick={() => onDelete(message.id)} className="p-1 rounded-lg bg-red-900/20 hover:bg-red-900/50 text-red-400/50 hover:text-red-300" title="حذف"><Trash2 className="w-3 h-3" /></button>}
      </div>
    </div>
  );
};

// ===================== MAIN =====================
const RoomChat: React.FC = () => {
  const { roomId } = useParams();
  const { lang } = useLanguage();
  const { user, profile, isOwner: isAppOwner } = useAuth();
  const { maxRoleLevel, permissions } = useUserRole();
  const navigate = useNavigate();

  const isJailed = profile?.jailed_in_room !== null && profile?.jailed_in_room !== undefined;
  const jailedRoomId = profile?.jailed_in_room;

  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [joinNotifications, setJoinNotifications] = useState<JoinNotification[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [myMembership, setMyMembership] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [showYouTube, setShowYouTube] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [memberCount, setMemberCount] = useState(0);
  const [showMicSettings, setShowMicSettings] = useState(false);
  const [showMicRequests, setShowMicRequests] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker]   = useState(false);
  const [showSmileyPicker, setShowSmileyPicker] = useState(false);
  const [showPlusMenu, setShowPlusMenu]         = useState(false);
  const [showDrawingBoard, setShowDrawingBoard] = useState(false);
  const [miniYtUrl, setMiniYtUrl]               = useState<string | null>(null);
  const [showRadio, setShowRadio]               = useState(false);
  const [showRadioEditor, setShowRadioEditor]   = useState(false);
  const [radioFolders, setRadioFolders]         = useState<RadioFolder[]>(loadRadioFromStorage);

  const [showRoleIconModal, setShowRoleIconModal] = useState(false);
  const [myRoles, setMyRoles] = useState<string[]>([]);

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);

  const settingsCache = useRef<Record<string, Partial<UserChatSettings> | null>>({});

  const { slots: micSlots, requests: micRequests, settings: micSettings, mySlot, myRequest, requestMic, cancelRequest, leaveSlot, approveRequest, rejectRequest, removeFromMic, toggleMuteMic, updateSettings: updateMicSettings } = useRoomMics(roomId);

  // ✅ يربط الصوت الحقيقي بالمايك
  const { isMicActive, micError } = useVoiceChat(roomId, !!mySlot);

  const isModOrOwner = isAppOwner || maxRoleLevel >= 3;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getRoleLevel = (role: string) => ({ owner: 6, super_owner: 6, super_admin: 5, admin: 4, moderator: 3, vip: 2, user: 1 }[role] || 1);

  const fetchMyRoles = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    if (data && data.length > 0) setMyRoles(data.map((r: any) => r.role));
  }, [user]);

  // ✅ تحميل إعدادات المستخدم الحالي من قاعدة البيانات عند كل دخول للغرفة
  // هذا يضمن أن أيقونة الرتبة المخصصة تبقى ثابتة ولا تختفي
  const fetchMySettings = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_settings')
      .select('name_color, font_color, name_bg_color, name_glow, name_glow_color, name_effect, role_icons')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      settingsCache.current[user.id] = data;
    }
  }, [user]);

  const fetchUserSettings = async (userId: string): Promise<Partial<UserChatSettings> | null> => {
    if (settingsCache.current[userId] !== undefined) return settingsCache.current[userId];
    const { data } = await supabase.from('user_settings').select('name_color, font_color, name_bg_color, name_glow, name_glow_color, name_effect, role_icons').eq('user_id', userId).maybeSingle();
    const localIcons = loadRoleIconsFromStorage(userId);
    const dbIcons = (data?.role_icons as Record<string, string>) || {};
    const mergedIcons = { ...localIcons, ...dbIcons };
    const result = data
      ? { ...data, role_icons: Object.keys(mergedIcons).length > 0 ? mergedIcons : data.role_icons }
      : (Object.keys(localIcons).length > 0 ? { role_icons: localIcons } : null);
    settingsCache.current[userId] = result;
    return result;
  };

  const fetchSenderInfo = async (senderId: string) => {
    const { data: sender } = await supabase.from('profiles').select('display_name, profile_picture, is_verified, is_vip, vip_type').eq('user_id', senderId).single();
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', senderId);
    let maxRole = 'user', maxLevel = 1;
    (roles || []).forEach((r: any) => { const rl = getRoleLevel(r.role); if (rl > maxLevel) { maxLevel = rl; maxRole = r.role; } });
    return { sender, senderRole: maxRole };
  };

  const enrichMessage = useCallback(async (msg: any) => {
    const { sender, senderRole } = await fetchSenderInfo(msg.sender_id);
    const senderSettings = await fetchUserSettings(msg.sender_id);
    let reply_to = null;
    if (msg.reply_to_id) {
      const { data: orig } = await supabase.from('chat_room_messages').select('content, sender_id').eq('id', msg.reply_to_id).single();
      if (orig) {
        const { data: sp } = await supabase.from('profiles').select('display_name').eq('user_id', orig.sender_id).single();
        reply_to = { content: orig.content, sender_display_name: sp?.display_name || '' };
      }
    }
    return { ...msg, sender, senderRole, senderSettings, reply_to };
  }, [roomId]);

  const getChatItems = useCallback((): ChatItem[] => {
    const allItems: ChatItem[] = [...messages, ...joinNotifications];
    allItems.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return allItems;
  }, [messages, joinNotifications]);

  const insertJoinLog = useCallback(async () => {
    if (!user || !roomId) return;
    await supabase.from('room_join_logs').insert({ room_id: roomId, user_id: user.id });
  }, [user, roomId, enrichMessage]);

  useEffect(() => {
    if (!user || !roomId) { navigate('/rooms'); return; }
    if (isJailed && jailedRoomId && roomId !== jailedRoomId) { toast.error('أنت محبوس'); navigate(`/rooms/${jailedRoomId}`); return; }
    fetchRoom(); fetchLatestMessages(); fetchMyMembership(); insertJoinLog(); fetchMyRoles(); fetchMySettings();
    setRadioFolders(loadRadioFromStorage());
    const ch = supabase.channel(`room_${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_room_messages', filter: `room_id=eq.${roomId}` },
        async (payload) => { const e = await enrichMessage(payload.new); setMessages(prev => { if (prev.some(m => m.id === e.id)) return prev; return [...prev, e]; }); })
      .subscribe();
    const mch = supabase.channel(`room_members_${roomId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_members', filter: `room_id=eq.${roomId}` }, fetchMemberCount).subscribe();
    const joinCh = supabase.channel(`room_join_logs_${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_join_logs', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const log = payload.new as any;
          const { data: profileData } = await supabase.from('profiles').select('display_name').eq('user_id', log.user_id).single();
          const displayName = profileData?.display_name || 'مجهول';
          const notification: JoinNotification = { id: `join_${log.id}`, type: 'join', display_name: displayName, created_at: log.created_at || new Date().toISOString() };
          setJoinNotifications(prev => [...prev, notification]);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); supabase.removeChannel(mch); supabase.removeChannel(joinCh); };
  }, [user, roomId]);

  useEffect(() => {
    if (messages.length > 0 && !loadingMore) requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' }));
  }, [messages.length, loadingMore]);

  useEffect(() => {
    if (joinNotifications.length > 0) requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
  }, [joinNotifications.length]);

  // ✅ عرض خطأ الميكروفون إذا وجد
  useEffect(() => {
    if (micError) toast.error(micError);
  }, [micError]);

  const fetchMemberCount = async () => {
    if (!roomId) return;
    const { count } = await supabase.from('chat_room_members').select('*', { count: 'exact', head: true }).eq('room_id', roomId).eq('is_banned', false);
    setMemberCount(count || 0);
  };

  const fetchRoom = async () => {
    if (!roomId) return;
    const { data, error } = await supabase.from('chat_rooms').select('*').eq('id', roomId).single();
    if (error) { navigate('/rooms'); return; }
    setRoom(data); await fetchMemberCount(); setLoading(false);
  };

  const fetchLatestMessages = async () => {
    if (!roomId) return;
    const { data } = await supabase.from('chat_room_messages').select('*').eq('room_id', roomId).eq('is_deleted', false).order('created_at', { ascending: false }).limit(MESSAGES_PER_PAGE);
    const reversed = (data || []).reverse();
    setHasMoreMessages((data || []).length === MESSAGES_PER_PAGE);
    setMessages(await Promise.all(reversed.map(enrichMessage)));
  };

  const loadMoreMessages = useCallback(async () => {
    if (!roomId || loadingMore || !hasMoreMessages || messages.length === 0) return;
    setLoadingMore(true);
    const { data } = await supabase.from('chat_room_messages').select('*').eq('room_id', roomId).eq('is_deleted', false).lt('created_at', messages[0].created_at).order('created_at', { ascending: false }).limit(MESSAGES_PER_PAGE);
    if ((data || []).length < MESSAGES_PER_PAGE) setHasMoreMessages(false);
    const msgs = await Promise.all((data || []).reverse().map(enrichMessage));
    setMessages(prev => [...msgs, ...prev]); setLoadingMore(false);
  }, [roomId, loadingMore, hasMoreMessages, messages]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const t = e.target as HTMLDivElement;
    if (t.scrollTop < 100 && hasMoreMessages && !loadingMore) loadMoreMessages();
  }, [loadMoreMessages, hasMoreMessages, loadingMore]);

  const fetchMyMembership = async () => {
    if (!roomId || !user) return;
    const { data } = await supabase.from('chat_room_members').select('*').eq('room_id', roomId).eq('user_id', user.id).single();
    setMyMembership(data);
    if (data?.is_banned) { toast.error('أنت محظور من هذه الغرفة'); navigate('/rooms'); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !roomId || !user || myMembership?.is_muted) return;
    const trimmed = newMessage.trim();
    const ytMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[^\s]*)?/);
    let payload: any;
    if (ytMatch) { const fullUrl = ytMatch[0].startsWith('http') ? ytMatch[0] : 'https://' + ytMatch[0]; payload = { room_id: roomId, sender_id: user.id, content: trimmed, message_type: 'youtube_auto', media_url: fullUrl }; }
    else { payload = { room_id: roomId, sender_id: user.id, content: trimmed, message_type: 'text' }; }
    if (replyTo) payload.reply_to_id = replyTo.id;
    const { data: inserted, error } = await supabase.from('chat_room_messages').insert(payload).select().single();
    setNewMessage(''); setReplyTo(null);
    if (!error && inserted) { const enriched = await enrichMessage(inserted); setMessages(prev => { if (prev.some(m => m.id === enriched.id)) return prev; return [...prev, enriched]; }); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !roomId || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('الصورة كبيرة جداً (الحد 5MB)'); return; }
    const path = `chat/${roomId}/${Date.now()}.${file.name.split('.').pop()}`;
    const { error: uploadError } = await supabase.storage.from('chat-media').upload(path, file);
    if (uploadError) { toast.error('فشل رفع الصورة'); return; }
    const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(path);
    const { data: imgInserted, error: insertError } = await supabase.from('chat_room_messages').insert({
      room_id: roomId, sender_id: user.id, content: '📷 صورة', message_type: 'image', media_url: urlData.publicUrl
    }).select().single();
    if (insertError) { toast.error('فشل إرسال الصورة'); return; }
    if (imgInserted) {
      const enriched = await enrichMessage(imgInserted);
      setMessages(prev => prev.some(m => m.id === enriched.id) ? prev : [...prev, enriched]);
    }
    toast.success('تم إرسال الصورة ✅'); e.target.value = '';
  };

  const handleSendAudio = async (blob: Blob) => {
    if (!roomId || !user) return; setIsRecordingAudio(false);
    const path = `chat/${roomId}/audio_${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage.from('chat-media').upload(path, blob);
    if (uploadError) { toast.error('فشل رفع الصوت'); return; }
    const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(path);
    const { data: audioInserted, error: insertError } = await supabase.from('chat_room_messages').insert({
      room_id: roomId, sender_id: user.id, content: '🎤 رسالة صوتية', message_type: 'audio', media_url: urlData.publicUrl
    }).select().single();
    if (insertError) { toast.error('فشل إرسال الصوت'); return; }
    if (audioInserted) {
      const enriched = await enrichMessage(audioInserted);
      setMessages(prev => prev.some(m => m.id === enriched.id) ? prev : [...prev, enriched]);
    }
    toast.success('تم إرسال الرسالة الصوتية ✅');
  };

  const handleDeleteMessage = async (msgId: string) => {
    const { error } = await supabase.from('chat_room_messages').update({ is_deleted: true, deleted_by: user?.id }).eq('id', msgId);
    if (error) { toast.error('فشل حذف الرسالة'); return; }
    setMessages(prev => prev.filter(m => m.id !== msgId)); toast.success('تم حذف الرسالة');
  };

  const handleMention = (name: string) => { setNewMessage(prev => prev + `@[${name}] `); inputRef.current?.focus(); };
  const handleOpenProfile = (uid: string) => { setSelectedUserId(uid); setShowProfileModal(true); };

  const handleYouTubeSelect = async (video: any) => {
    if (!roomId || !user) return;
    const { data: ytInserted } = await supabase.from('chat_room_messages').insert({ room_id: roomId, sender_id: user.id, content: video.title, message_type: 'youtube', media_url: `https://www.youtube.com/watch?v=${video.id}` }).select().single();
    setShowYouTube(false);
    if (ytInserted) { const enriched = await enrichMessage(ytInserted); setMessages(prev => prev.some(m => m.id === enriched.id) ? prev : [...prev, enriched]); }
    toast.success('تم إرسال الفيديو 🎬');
  };

  const saveRadioFolders = (folders: RadioFolder[]) => { setRadioFolders(folders); saveRadioToStorage(folders); toast.success('تم حفظ الراديو ✓'); };

  const handleRoleIconUpdated = useCallback((role: string, url: string | null) => {
    if (!user) return;
    const cached = settingsCache.current[user.id];
    const newRoleIcons = { ...(cached?.role_icons as Record<string, string> || {}) };
    if (url) newRoleIcons[role] = url;
    else delete newRoleIcons[role];
    saveRoleIconsToStorage(user.id, newRoleIcons);
    const updated = { ...(cached || {}), role_icons: newRoleIcons };
    settingsCache.current[user.id] = updated;
    setMessages(prev => prev.map(msg =>
      msg.sender_id === user.id ? { ...msg, senderSettings: { ...(msg.senderSettings || {}), role_icons: newRoleIcons } } : msg
    ));
  }, [user]);

  const clearChat = async () => {
    if (!roomId || !isAppOwner) return;
    await supabase.from('chat_room_messages').update({ is_deleted: true, deleted_by: user?.id }).eq('room_id', roomId);
    setMessages([]); setJoinNotifications([]); toast.success('تم مسح الدردشة');
  };

  if (loading || !room) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const chatItems = getChatItems();

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      <div className="fixed inset-0 z-0" style={{ backgroundColor: room.background_color || '#1a1a2e', backgroundImage: room.background_url ? `url(${room.background_url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }} />

      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 glass-dark border-b border-border/30">
          <div className="flex items-center gap-2 p-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/rooms')}><ChevronLeft className="w-5 h-5" /></Button>
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl overflow-hidden">
              {room.background_url ? <img src={room.background_url} alt="" className="w-full h-full object-cover" /> : room.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold truncate text-sm">{room.name}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {memberCount} متصل
                {isMicActive && <span className="flex items-center gap-0.5 text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />مايك مفعّل</span>}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <RoomSwitcher currentRoomId={roomId}><Button variant="ghost" size="icon"><Layers className="w-5 h-5" /></Button></RoomSwitcher>
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}><Home className="w-5 h-5" /></Button>
              <Button variant="ghost" size="icon"><UserPlus className="w-5 h-5" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setShowOnlineUsers(true)} className="relative">
                <Users className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] flex items-center justify-center font-bold">{memberCount}</span>
              </Button>
              {isModOrOwner && micRequests.length > 0 && (
                <Button variant="ghost" size="icon" onClick={() => setShowMicRequests(true)} className="relative">
                  <Hand className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] flex items-center justify-center font-bold">{micRequests.length}</span>
                </Button>
              )}
              {isAppOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowSettings(true)}><Settings className="w-4 h-4 mr-2" />إعدادات الغرفة</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowMicSettings(true)}><Mic className="w-4 h-4 mr-2" />إعدادات المايكات</DropdownMenuItem>
                    <DropdownMenuItem onClick={clearChat} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />مسح الدردشة</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          {room.pinned_message && (
            <div className="px-3 pb-2">
              <div className="bg-primary/10 rounded-lg p-2 flex items-start gap-2">
                <Pin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm">{room.pinned_message}</p>
              </div>
            </div>
          )}
        </header>

        {micSettings?.mic_enabled && (
          <MicSlotsDisplay slots={micSlots} settings={micSettings} maxSlots={micSettings.mic_count}
            isModOrOwner={isModOrOwner} mySlot={mySlot} hasMyRequest={!!myRequest}
            onRequestMic={requestMic} onCancelRequest={cancelRequest} onLeaveSlot={leaveSlot}
            onRemoveFromMic={removeFromMic} onToggleMute={toggleMuteMic} />
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 px-1" ref={scrollAreaRef} onScrollCapture={handleScroll}>
          <div className="py-1.5">
            {loadingMore && <div className="text-center py-1"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>}
            {hasMoreMessages && !loadingMore && messages.length > 0 && (
              <div className="text-center py-1"><Button variant="ghost" size="sm" className="text-xs h-6" onClick={loadMoreMessages}>تحميل المزيد</Button></div>
            )}
            {room.welcome_message && messages.length === 0 && joinNotifications.length === 0 && (
              <div className="text-center py-4"><p className="inline-block px-4 py-2 rounded-full bg-primary/10 text-sm">{room.welcome_message}</p></div>
            )}
            {chatItems.map((item) => {
              if (isJoinNotification(item)) return <JoinNotificationItem key={item.id} notification={item} />;
              return (
                <ChatMessageItem key={item.id} message={item as Message}
                  currentUserId={user?.id || ''} currentUserDisplayName={profile?.display_name || ''}
                  isModOrOwner={isModOrOwner} onReply={setReplyTo} onDelete={handleDeleteMessage}
                  onMention={handleMention} onOpenProfile={handleOpenProfile} onOpenMiniYt={(url) => setMiniYtUrl(url)} />
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="sticky bottom-0 z-40 glass-dark border-t border-border/30 p-2">
          {myMembership?.is_muted ? (
            <div className="text-center text-muted-foreground py-2 text-sm">أنت مكتوم في هذه الغرفة</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {replyTo && (
                <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-1" dir="rtl">
                  <Reply className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-primary font-bold truncate">{replyTo.sender?.display_name}</p>
                    <p className="text-[11px] text-white/50 truncate">{replyTo.content}</p>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="text-white/40 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}
              {isRecordingAudio ? (
                <AudioRecorder onSend={handleSendAudio} onCancel={() => setIsRecordingAudio(false)} />
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => { setShowPlusMenu(p => !p); setShowEmojiPicker(false); setShowSmileyPicker(false); }}
                      className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center text-white/50 hover:border-primary hover:text-primary transition-all duration-200 flex-shrink-0"
                      style={{ transform: showPlusMenu ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
                      title="المزيد"
                    >
                      <span className="text-xl font-light leading-none">+</span>
                    </button>

                    {showPlusMenu && (
                      <div className="absolute bottom-10 right-0 z-50 bg-[#12121f] border border-white/10 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 min-w-[165px]" style={{ animation: 'popIn 0.15s ease' }}>
                        <button onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false); }}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-white/70 hover:text-white text-sm">
                          <Image className="w-4 h-4 text-blue-400 flex-shrink-0" /><span>إرسال صورة</span>
                        </button>
                        {maxRoleLevel >= 2 && (
                          <button onClick={() => { setShowYouTube(true); setShowPlusMenu(false); }}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-white/70 hover:text-white text-sm">
                            <Youtube className="w-4 h-4 text-red-400 flex-shrink-0" /><span>مقطع يوتيوب</span>
                          </button>
                        )}
                        <button onClick={() => { setShowDrawingBoard(true); setShowPlusMenu(false); }}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-white/70 hover:text-white text-sm">
                          <span className="text-base flex-shrink-0">🎨</span><span>لوحة الرسم</span>
                        </button>
                        <button onClick={() => { setShowRadio(true); setShowPlusMenu(false); }}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-white/70 hover:text-white text-sm">
                          <Radio className="w-4 h-4 text-purple-400 flex-shrink-0" /><span>الراديو</span>
                        </button>
                        <button onClick={() => { setShowSmileyPicker(true); setShowEmojiPicker(false); setShowPlusMenu(false); }}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-white/70 hover:text-white text-sm">
                          <span className="text-base flex-shrink-0">🖼️</span><span>إيموجيات مخصصة</span>
                        </button>
                        {myRoles.length > 0 && (
                          <button onClick={() => { setShowRoleIconModal(true); setShowPlusMenu(false); }}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-white/70 hover:text-white text-sm">
                            <ImagePlus className="w-4 h-4 text-purple-400 flex-shrink-0" /><span>أيقونة الرتبة</span>
                          </button>
                        )}
                      </div>
                    )}

                    {showSmileyPicker && (
                      <SmileyPicker
                        onSelect={(code) => { setNewMessage(prev => prev + `:${code}: `); setShowSmileyPicker(false); inputRef.current?.focus(); }}
                        onClose={() => setShowSmileyPicker(false)}
                      />
                    )}
                  </div>

                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

                  <button onClick={() => setIsRecordingAudio(true)} className="p-1.5 rounded-xl text-white/50 hover:text-red-400 hover:bg-red-900/20 transition-all flex-shrink-0">
                    <Mic className="w-5 h-5" />
                  </button>

                  <div className="flex-1 relative">
                    <Input ref={inputRef} value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="اكتب هنا..." onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      className="pr-9 bg-muted/50 h-9 text-sm" dir="rtl" />
                    <button
                      onClick={() => { setShowEmojiPicker(p => !p); setShowSmileyPicker(false); setShowPlusMenu(false); }}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 transition-colors ${showEmojiPicker ? 'text-yellow-400' : 'text-white/40 hover:text-yellow-400'}`}
                      title="إيموجيات"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                    {showEmojiPicker && (
                      <EmojiPicker
                        onSelect={(e) => { setNewMessage(prev => prev + e); setShowEmojiPicker(false); inputRef.current?.focus(); }}
                        onClose={() => setShowEmojiPicker(false)}
                      />
                    )}
                  </div>

                  <Button size="icon" onClick={sendMessage} disabled={!newMessage.trim()} className="gradient-primary flex-shrink-0 h-9 w-9">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showRadio && <RadioPlayer folders={radioFolders} isAppOwner={isAppOwner} onEditRequest={() => { setShowRadio(false); setShowRadioEditor(true); }} onClose={() => setShowRadio(false)} />}
      {showRadioEditor && <RadioEditor folders={radioFolders} onSave={saveRadioFolders} onClose={() => { setShowRadioEditor(false); setShowRadio(true); }} />}
      {showDrawingBoard && (
        <DrawingBoard
          onSend={async (blob) => {
            setShowDrawingBoard(false); if (!roomId || !user) return;
            const path = `chat/${roomId}/drawing_${Date.now()}.png`;
            const { error: uploadError } = await supabase.storage.from('chat-media').upload(path, blob);
            if (uploadError) { toast.error('فشل إرسال الرسمة'); return; }
            const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(path);
            const { data: drawInserted, error: insertError } = await supabase.from('chat_room_messages').insert({
              room_id: roomId, sender_id: user.id, content: '🎨 رسمة', message_type: 'image', media_url: urlData.publicUrl
            }).select().single();
            if (insertError) { toast.error('فشل إرسال الرسمة'); return; }
            if (drawInserted) {
              const enriched = await enrichMessage(drawInserted);
              setMessages(prev => prev.some(m => m.id === enriched.id) ? prev : [...prev, enriched]);
            }
            toast.success('تم إرسال الرسمة! 🎨');
          }}
          onClose={() => setShowDrawingBoard(false)}
        />
      )}
      <OnlineUsersSidebar isOpen={showOnlineUsers} onClose={() => setShowOnlineUsers(false)} roomId={room.id} onMention={handleMention} onOpenProfile={handleOpenProfile} />
      <YouTubePlayer isOpen={showYouTube} onClose={() => setShowYouTube(false)} onSelectVideo={handleYouTubeSelect} />
      <UserProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} userId={selectedUserId} currentUserRole={maxRoleLevel} isAppOwner={isAppOwner} />
      <RoomSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} room={room} onUpdate={fetchRoom} />
      <MicSettingsModal isOpen={showMicSettings} onClose={() => setShowMicSettings(false)} roomName={room.name} settings={micSettings} onSave={updateMicSettings} />
      <MicRequestsModal isOpen={showMicRequests} onClose={() => setShowMicRequests(false)} requests={micRequests} slots={micSlots} maxSlots={micSettings?.mic_count || 4} onApprove={approveRequest} onReject={rejectRequest} />

      {miniYtUrl && <YTMiniPlayer url={miniYtUrl} onClose={() => setMiniYtUrl(null)} />}

      {showRoleIconModal && user && (
        <RoleIconModal
          userId={user.id}
          userRoles={myRoles}
          onClose={() => setShowRoleIconModal(false)}
          onIconUpdated={handleRoleIconUpdated}
        />
      )}

      <style>{`
        @keyframes animGold  { 0%,100%{filter:drop-shadow(0 0 3px #FFD700);transform:scale(1)}     50%{filter:drop-shadow(0 0 9px #FFD700) drop-shadow(0 0 18px #FFD70088);transform:scale(1.2)} }
        @keyframes animBlue  { 0%,100%{filter:drop-shadow(0 0 3px #00BFFF);transform:scale(1)}     50%{filter:drop-shadow(0 0 9px #00BFFF) drop-shadow(0 0 18px #00BFFF88);transform:scale(1.2)} }
        @keyframes animSpin  { 0%{transform:rotate(-15deg) scale(1)} 50%{transform:rotate(15deg) scale(1.2)} 100%{transform:rotate(-15deg) scale(1)} }
        @keyframes animFlash { 0%,100%{opacity:1;filter:drop-shadow(0 0 3px #C77DFF)} 50%{opacity:0.5;filter:drop-shadow(0 0 12px #C77DFFcc)} }
        @keyframes animGreen { 0%,100%{filter:drop-shadow(0 0 3px #2ECC71);transform:scale(1)}     50%{filter:drop-shadow(0 0 9px #2ECC71cc);transform:scale(1.18)} }
        @keyframes animFloat { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-3px) scale(1.18)} }
        @keyframes popIn { from{opacity:0;transform:scale(0.92) translateY(6px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>
    </div>
  );
};

export default RoomChat;
