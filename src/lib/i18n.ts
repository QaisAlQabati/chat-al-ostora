export type Language = 'ar' | 'en';

export const translations = {
  ar: {
    // App
    appName: 'لايف تشات',
    
    // Auth
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب',
    logout: 'تسجيل الخروج',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    displayName: 'الاسم المعروض',
    username: 'اسم المستخدم',
    forgotPassword: 'نسيت كلمة المرور؟',
    noAccount: 'ليس لديك حساب؟',
    hasAccount: 'لديك حساب؟',
    
    // Navigation
    home: 'الرئيسية',
    explore: 'استكشاف',
    live: 'لايف',
    messages: 'الرسائل',
    profile: 'الملف الشخصي',
    settings: 'الإعدادات',
    admin: 'الإدارة',
    
    // Profile
    editProfile: 'تعديل الملف',
    followers: 'متابع',
    following: 'متابَع',
    friends: 'أصدقاء',
    points: 'نقاط',
    ruby: 'روبي',
    diamonds: 'ماس',
    level: 'المستوى',
    verified: 'موثق',
    vip: 'VIP',
    
    // Stories
    stories: 'الاستوريات',
    addStory: 'إضافة استوري',
    noStories: 'لا توجد استوريات',
    viewStory: 'مشاهدة الاستوري',
    
    // Live
    startLive: 'بدء البث المباشر',
    endLive: 'إنهاء البث',
    viewers: 'مشاهد',
    liveNow: 'مباشر الآن',
    personalLive: 'لايفي الخاص',
    publicRooms: 'الغرف العامة',
    
    // Chat
    typeMessage: 'اكتب رسالة...',
    send: 'إرسال',
    
    // Gifts
    sendGift: 'إرسال هدية',
    gifts: 'الهدايا',
    
    // Actions
    follow: 'متابعة',
    unfollow: 'إلغاء المتابعة',
    addFriend: 'إضافة صديق',
    removeFriend: 'إزالة صديق',
    message: 'رسالة',
    block: 'حظر',
    report: 'إبلاغ',
    
    // Common
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    search: 'بحث',
    loading: 'جاري التحميل...',
    noResults: 'لا توجد نتائج',
    online: 'متصل',
    offline: 'غير متصل',
    
    // Admin
    dashboard: 'لوحة التحكم',
    users: 'المستخدمين',
    totalUsers: 'إجمالي المستخدمين',
    onlineNow: 'متصل الآن',
    activeLives: 'اللايفات النشطة',
    todayStories: 'استوريات اليوم',
    manageUsers: 'إدارة المستخدمين',
    manageGifts: 'إدارة الهدايا',
    manageRooms: 'إدارة الغرف',
    reports: 'البلاغات',
    announcements: 'الإعلانات',
  },
  en: {
    // App
    appName: 'Live Chat',
    
    // Auth
    login: 'Login',
    register: 'Create Account',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    displayName: 'Display Name',
    username: 'Username',
    forgotPassword: 'Forgot Password?',
    noAccount: "Don't have an account?",
    hasAccount: 'Have an account?',
    
    // Navigation
    home: 'Home',
    explore: 'Explore',
    live: 'Live',
    messages: 'Messages',
    profile: 'Profile',
    settings: 'Settings',
    admin: 'Admin',
    
    // Profile
    editProfile: 'Edit Profile',
    followers: 'Followers',
    following: 'Following',
    friends: 'Friends',
    points: 'Points',
    ruby: 'Ruby',
    diamonds: 'Diamonds',
    level: 'Level',
    verified: 'Verified',
    vip: 'VIP',
    
    // Stories
    stories: 'Stories',
    addStory: 'Add Story',
    noStories: 'No Stories',
    viewStory: 'View Story',
    
    // Live
    startLive: 'Start Live Stream',
    endLive: 'End Live',
    viewers: 'Viewers',
    liveNow: 'Live Now',
    personalLive: 'My Live',
    publicRooms: 'Public Rooms',
    
    // Chat
    typeMessage: 'Type a message...',
    send: 'Send',
    
    // Gifts
    sendGift: 'Send Gift',
    gifts: 'Gifts',
    
    // Actions
    follow: 'Follow',
    unfollow: 'Unfollow',
    addFriend: 'Add Friend',
    removeFriend: 'Remove Friend',
    message: 'Message',
    block: 'Block',
    report: 'Report',
    
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    search: 'Search',
    loading: 'Loading...',
    noResults: 'No Results',
    online: 'Online',
    offline: 'Offline',
    
    // Admin
    dashboard: 'Dashboard',
    users: 'Users',
    totalUsers: 'Total Users',
    onlineNow: 'Online Now',
    activeLives: 'Active Lives',
    todayStories: 'Stories Today',
    manageUsers: 'Manage Users',
    manageGifts: 'Manage Gifts',
    manageRooms: 'Manage Rooms',
    reports: 'Reports',
    announcements: 'Announcements',
    
    // Roles
    member: 'Member',
    vipMember: 'VIP Member',
    moderator: 'Moderator',
    adminRole: 'Admin',
    superAdmin: 'Super Admin',
    siteOwner: 'Site Owner',
    
    // Permissions
    changeEmail: 'Change Email',
    changePassword: 'Change Password',
    accountSettings: 'Account Settings',
    chatSettings: 'Chat Settings',
    yourPermissions: 'Your Permissions',
  },
};

export const useTranslation = (lang: Language) => {
  const t = (key: keyof typeof translations.ar) => {
    return translations[lang][key] || key;
  };
  
  return { t, lang };
};
