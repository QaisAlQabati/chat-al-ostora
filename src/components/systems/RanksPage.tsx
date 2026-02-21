import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const ranks = [
    { level: 1, emoji: '👤', name_ar: 'عضو عادي', name_en: 'Regular Member', details_ar: 'عضو عادي في الموقع', details_en: 'Entry-level member.' },
    { level: 2, emoji: '✨', name_ar: 'عضو مميز', name_en: 'VIP Member', details_ar: 'عضو مميز في الموقع', details_en: 'Valued member with special status.' },
    { level: 3, emoji: '💫', name_ar: 'عضو ملكي', name_en: 'Royal Member', details_ar: 'عضو ملكي برتبة عالية', details_en: 'Royal member with elevated status.' },
    { level: 4, emoji: '🛡️', name_ar: 'مشرف', name_en: 'Moderator', details_ar: 'مشرف على الموقع والغرف', details_en: 'Moderator managing the community.' },
    { level: 5, emoji: '🔱', name_ar: 'أدمن', name_en: 'Admin', details_ar: 'مسؤول إداري', details_en: 'Administrative staff member.' },
    { level: 6, emoji: '⚡', name_ar: 'سوبر أدمن', name_en: 'Super Admin', details_ar: 'مسؤول إداري برتبة عليا', details_en: 'Senior administrative staff.' },
    { level: 7, emoji: '⭐', name_ar: 'الإدارة', name_en: 'Administration', details_ar: 'إدارة الموقع', details_en: 'Main administration.' },
    { level: 8, emoji: '👑', name_ar: 'الإدارة العليا', name_en: 'Upper Administration', details_ar: 'إدارة عليا للموقع', details_en: 'Upper administration.' },
    { level: 9, emoji: '⚜️', name_ar: 'جناح الملوك', name_en: 'Crown Wing', details_ar: 'معيّن من مالك الموقع بصلاحيات عليا', details_en: 'Appointed by site owner with high privileges.' },
    { level: 10, emoji: '🏆', name_ar: 'مالك الموقع', name_en: 'Site Owner', details_ar: 'مالك الموقع الأصلي - سلطة عليا', details_en: 'Original site owner - highest authority.' },
];

const RanksPage: React.FC = () => {
    const { lang } = useLanguage();

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">{lang === 'ar' ? 'نظام الرتب' : 'Ranks System'}</h1>
                <p className="text-muted-foreground">{lang === 'ar' ? 'نظام الرتب الكامل في الموقع' : 'Complete ranking system on the site.'}</p>
            </div>

            <div className="grid gap-4">
                {ranks.map((rank) => (
                    <div key={rank.level} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-4">
                            <div className="text-5xl">{rank.emoji}</div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-xl font-bold">{lang === 'ar' ? rank.name_ar : rank.name_en}</h2>
                                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                                        {lang === 'ar' ? `المستوى ${rank.level}` : `Level ${rank.level}`}
                                    </span>
                                </div>
                                <p className="text-muted-foreground">{lang === 'ar' ? rank.details_ar : rank.details_en}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RanksPage;
