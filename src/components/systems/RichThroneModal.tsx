import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Crown, Medal } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface RichMember {
    user_id: string;
    display_name: string;
    username: string;
    profile_picture: string | null;
    ruby: number;
    rank: number;
}

const RichThroneModal = () => {
    const { lang } = useLanguage();
    const [members, setMembers] = useState<RichMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRichestMembers();
    }, []);

    const fetchRichestMembers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('user_id, display_name, username, profile_picture, ruby')
                .gt('ruby', 0)
                .order('ruby', { ascending: false })
                .limit(50);

            if (error) throw error;

            const enrichedData = (data || []).map((member, index) => ({
                ...member,
                rank: index + 1,
            }));

            setMembers(enrichedData);
        } catch (error) {
            console.error('Error fetching richest members:', error);
        } finally {
            setLoading(false);
        }
    };

    const getMedalEmoji = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `${rank}`;
    };

    const getTitleColor = (rank: number) => {
        if (rank === 1) return 'text-yellow-400';
        if (rank === 2) return 'text-gray-400';
        if (rank === 3) return 'text-orange-400';
        return 'text-foreground';
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <Crown className="w-8 h-8 text-yellow-400" />
                    <h1 className="text-3xl font-bold">
                        {lang === 'ar' ? 'عرش الأثرياء' : 'Rich Throne'}
                    </h1>
                    <Crown className="w-8 h-8 text-yellow-400" />
                </div>
                <p className="text-muted-foreground">
                    {lang === 'ar' ? 'أكثر 50 عضو روبي' : 'Top 50 Members by Ruby'}
                </p>
            </div>

            {/* Top 3 Podium */}
            {members.length > 0 && (
                <div className="mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {/* 2nd Place */}
                        {members[1] && (
                            <div className="relative bg-gradient-to-br from-gray-400/20 to-gray-600/20 border-2 border-gray-400 rounded-2xl p-6 text-center">
                                <div className="text-3xl mb-2">🥈</div>
                                <Avatar className="w-20 h-20 mx-auto mb-3 border-2 border-gray-400">
                                    <AvatarImage src={members[1].profile_picture || ''} />
                                    <AvatarFallback>{members[1].display_name[0]}</AvatarFallback>
                                </Avatar>
                                <h3 className="font-bold text-lg">{members[1].display_name}</h3>
                                <p className="text-sm text-muted-foreground">@{members[1].username}</p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    {lang === 'ar' ? 'روبي مخفي 💎' : 'Hidden Ruby 💎'}
                                </p>
                            </div>
                        )}

                        {/* 1st Place */}
                        {members[0] && (
                            <div className="relative bg-gradient-to-br from-yellow-400/30 to-yellow-600/20 border-4 border-yellow-400 rounded-2xl p-6 text-center scale-105">
                                <div className="absolute -top-4 -right-4 bg-yellow-400 text-black rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl">
                                    🥇
                                </div>
                                <Avatar className="w-24 h-24 mx-auto mb-3 border-4 border-yellow-400">
                                    <AvatarImage src={members[0].profile_picture || ''} />
                                    <AvatarFallback>{members[0].display_name[0]}</AvatarFallback>
                                </Avatar>
                                <h3 className="font-bold text-xl">{members[0].display_name}</h3>
                                <p className="text-sm text-muted-foreground">@{members[0].username}</p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    {lang === 'ar' ? 'روبي مخفي 💎' : 'Hidden Ruby 💎'}
                                </p>
                            </div>
                        )}

                        {/* 3rd Place */}
                        {members[2] && (
                            <div className="relative bg-gradient-to-br from-orange-400/20 to-orange-600/20 border-2 border-orange-400 rounded-2xl p-6 text-center">
                                <div className="text-3xl mb-2">🥉</div>
                                <Avatar className="w-20 h-20 mx-auto mb-3 border-2 border-orange-400">
                                    <AvatarImage src={members[2].profile_picture || ''} />
                                    <AvatarFallback>{members[2].display_name[0]}</AvatarFallback>
                                </Avatar>
                                <h3 className="font-bold text-lg">{members[2].display_name}</h3>
                                <p className="text-sm text-muted-foreground">@{members[2].username}</p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    {lang === 'ar' ? 'روبي مخفي 💎' : 'Hidden Ruby 💎'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Full List */}
            <div className="space-y-2">
                <h2 className="text-xl font-bold mb-4">
                    {lang === 'ar' ? 'القائمة الكاملة' : 'Full List'}
                </h2>
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                        {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                    </div>
                ) : members.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        {lang === 'ar' ? 'لا يوجد أعضاء بعد' : 'No members yet'}
                    </div>
                ) : (
                    members.map((member, index) => (
                        <div
                            key={member.user_id}
                            className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                        >
                            <div className={`text-lg font-bold w-8 text-center ${getTitleColor(member.rank)}`}>
                                {getMedalEmoji(member.rank)}
                            </div>
                            <Avatar className="w-12 h-12 flex-shrink-0">
                                <AvatarImage src={member.profile_picture || ''} />
                                <AvatarFallback>{member.display_name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{member.display_name}</p>
                                <p className="text-xs text-muted-foreground truncate">@{member.username}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-sm font-medium">💎 {lang === 'ar' ? 'مخفي' : 'Hidden'}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer Note */}
            <div className="mt-8 p-4 bg-primary/10 rounded-lg text-center text-sm text-muted-foreground">
                <p>{lang === 'ar' ? '✨ عدد الروبي مخفي لجميع الأعضاء' : '✨ Ruby count is hidden for all members'}</p>
            </div>
        </div>
    );
};

export default RichThroneModal;
