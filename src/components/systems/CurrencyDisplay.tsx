import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const CurrencyDisplay: React.FC<{ ruby: number; points: number }> = ({ ruby, points }) => {
    const { lang } = useLanguage();

    return (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <span className="text-rose-400 text-lg">💎</span>
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">{lang === 'ar' ? 'روبي' : 'Ruby'}</span>
                    <span className="font-bold text-rose-400">{ruby.toLocaleString()}</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-amber-400 text-lg">⭐</span>
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">{lang === 'ar' ? 'نقاط' : 'Points'}</span>
                    <span className="font-bold text-amber-400">{points.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

export default CurrencyDisplay;
