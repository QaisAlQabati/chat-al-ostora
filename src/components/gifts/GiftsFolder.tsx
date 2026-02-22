import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, Gift, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface ReceivedGift {
  id: string;
  gift_id: string;
  sender_id: string;
  receiver_id: string;
  quantity: number;
  total_points: number;
  created_at: string | null;
  context: string | null;
  gift_emoji: string;
  gift_name_ar: string;
  gift_name_en: string;
  sender_name: string;
  sender_picture: string | null;
  is_visible: boolean;
}

interface GiftsFolderProps {
  userId: string;
  isOwnProfile: boolean;
}

const GiftsFolder: React.FC<GiftsFolderProps> = ({ userId, isOwnProfile }) => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [gifts, setGifts] = useState<ReceivedGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchGifts();
  }, [userId]);

  const fetchGifts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sent_gifts')
        .select(`
          id,
          gift_id,
          sender_id,
          receiver_id,
          quantity,
          total_points,
          created_at,
          context,
          gifts(id, name_ar, name_en, image_url),
          profiles!sender_id(display_name, profile_picture)
        `)
        .eq('receiver_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedGifts: ReceivedGift[] = (data || []).map((item: any) => ({
        id: item.id,
        gift_id: item.gift_id,
        sender_id: item.sender_id,
        receiver_id: item.receiver_id,
        quantity: item.quantity,
        total_points: item.total_points,
        created_at: item.created_at,
        context: item.context,
        gift_emoji: item.gifts?.[0]?.image_url || '🎁',
        gift_name_ar: item.gifts?.[0]?.name_ar || '',
        gift_name_en: item.gifts?.[0]?.name_en || '',
        sender_name: item.profiles?.display_name || 'Unknown',
        sender_picture: item.profiles?.profile_picture,
        is_visible: true, // Default to visible - this will be stored in DB when schema is updated
      }));

      setGifts(enrichedGifts);
    } catch (error) {
      console.error('Error fetching gifts:', error);
      toast.error(lang === 'ar' ? 'خطأ في تحميل الهدايا' : 'Error loading gifts');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (giftId: string) => {
    setTogglingId(giftId);
    const gift = gifts.find(g => g.id === giftId);
    if (!gift) return;

    try {
      // TODO: Update when is_visible column is added to sent_gifts table
      // For now, this is UI-only
      setGifts(gifts.map(g => 
        g.id === giftId ? { ...g, is_visible: !g.is_visible } : g
      ));

      toast.success(
        !gift.is_visible
          ? (lang === 'ar' ? 'تم إظهار الهدية' : 'Gift shown')
          : (lang === 'ar' ? 'تم إخفاء الهدية' : 'Gift hidden')
      );
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error(lang === 'ar' ? 'خطأ في تحديث الهدية' : 'Error updating gift');
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (gifts.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Gift className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            {lang === 'ar' ? 'لم تتلقَ أي هدايا بعد' : 'No gifts received yet'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const visibleGifts = gifts.filter(g => g.is_visible);
  const hiddenGifts = gifts.filter(g => !g.is_visible);

  return (
    <div className="space-y-6">
      {/* Visible Gifts Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5" />
          {lang === 'ar' ? 'الهدايا المعروضة' : 'Displayed Gifts'} ({visibleGifts.length})
        </h3>
        {visibleGifts.length > 0 ? (
          <div className="grid gap-4">
            {visibleGifts.map((gift) => (
              <Card key={gift.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarImage src={gift.sender_picture || ''} />
                      <AvatarFallback>{gift.sender_name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{gift.sender_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {lang === 'ar' ? 'أرسل هدية' : 'sent a gift'}
                      </p>
                    </div>
                    <div className="text-4xl">{gift.gift_emoji}</div>
                  </div>

                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium">
                      {lang === 'ar' ? gift.gift_name_ar : gift.gift_name_en}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(gift.created_at || '').toLocaleDateString(
                        lang === 'ar' ? 'ar-SA' : 'en-US'
                      )}
                    </p>
                  </div>

                  {isOwnProfile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleVisibility(gift.id)}
                      disabled={togglingId === gift.id}
                      className="w-full mt-3 gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      {lang === 'ar' ? 'إخفاء من الملف الشخصي' : 'Hide from profile'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="py-8">
            <CardContent className="text-center text-muted-foreground">
              {lang === 'ar' ? 'لا توجد هدايا معروضة' : 'No displayed gifts'}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Hidden Gifts Section (only show to owner) */}
      {isOwnProfile && hiddenGifts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <EyeOff className="w-5 h-5" />
            {lang === 'ar' ? 'الهدايا المخفية' : 'Hidden Gifts'} ({hiddenGifts.length})
          </h3>
          <div className="grid gap-4">
            {hiddenGifts.map((gift) => (
              <Card key={gift.id} className="overflow-hidden opacity-75 hover:opacity-100 transition-opacity">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarImage src={gift.sender_picture || ''} />
                      <AvatarFallback>{gift.sender_name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{gift.sender_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {lang === 'ar' ? 'أرسل هدية' : 'sent a gift'}
                      </p>
                    </div>
                    <div className="text-4xl">{gift.gift_emoji}</div>
                  </div>

                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium">
                      {lang === 'ar' ? gift.gift_name_ar : gift.gift_name_en}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(gift.created_at || '').toLocaleDateString(
                        lang === 'ar' ? 'ar-SA' : 'en-US'
                      )}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleVisibility(gift.id)}
                    disabled={togglingId === gift.id}
                    className="w-full mt-3 gap-2"
                  >
                    <EyeOff className="w-4 h-4" />
                    {lang === 'ar' ? 'إظهار في الملف الشخصي' : 'Show on profile'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Summary for other visitors */}
      {!isOwnProfile && visibleGifts.length > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <p className="text-sm text-muted-foreground">
            {lang === 'ar'
              ? `تلقى هذا العضو إجمالي ${visibleGifts.length} هدايا معروضة`
              : `This member has received ${visibleGifts.length} displayed gifts`}
          </p>
        </Card>
      )}
    </div>
  );
};

export default GiftsFolder;
