import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Gift {
  id: string;
  name_ar: string;
  name_en: string;
  image_url: string;
  price_points: number;
  rarity: string;
  category: string;
}

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiverId: string;
  receiverName: string;
  context?: 'live' | 'profile' | 'chat';
  liveId?: string;
}

const rarityColors = {
  common: 'border-muted-foreground',
  rare: 'border-accent',
  epic: 'border-secondary',
  legendary: 'border-gold',
};

const GiftModal: React.FC<GiftModalProps> = ({
  isOpen,
  onClose,
  receiverId,
  receiverName,
  context = 'profile',
  liveId,
}) => {
  const { lang } = useLanguage();
  const { profile, user, refreshProfile } = useAuth();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    if (isOpen) {
      fetchGifts();
    }
  }, [isOpen]);

  const fetchGifts = async () => {
    try {
      const { data, error } = await supabase
        .from('gifts')
        .select('*')
        .eq('is_active', true)
        .order('price_points', { ascending: true });

      if (error) throw error;
      setGifts(data || []);
    } catch (error) {
      console.error('Error fetching gifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...new Set(gifts.map(g => g.category))];

  const filteredGifts = activeCategory === 'all'
    ? gifts
    : gifts.filter(g => g.category === activeCategory);

  const totalCost = selectedGift ? selectedGift.price_points * quantity : 0;
  const canAfford = profile ? profile.points >= totalCost : false;

  const handleSendGift = async () => {
    if (!selectedGift || !user || !profile || !canAfford) return;

    setSending(true);
    try {
      // Deduct points
      const newBalance = profile.points - totalCost;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ points: newBalance })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Record gift
      const { error: giftError } = await supabase
        .from('sent_gifts')
        .insert({
          gift_id: selectedGift.id,
          sender_id: user.id,
          receiver_id: receiverId,
          quantity,
          total_points: totalCost,
          context,
          live_id: liveId,
        });

      if (giftError) throw giftError;

      // Add points to receiver
      const { data: receiverProfile } = await supabase
        .from('profiles')
        .select('points')
        .eq('user_id', receiverId)
        .single();
      
      if (receiverProfile) {
        await supabase
          .from('profiles')
          .update({ points: receiverProfile.points + Math.floor(totalCost * 0.7) })
          .eq('user_id', receiverId);
      }

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: user.id,
        transaction_type: 'gift_sent',
        currency: 'points',
        amount: -totalCost,
        balance_after: newBalance,
        description: `Sent ${quantity}x ${selectedGift.name_en} to ${receiverName}`,
      });

      await refreshProfile();
      toast.success(
        lang === 'ar'
          ? `تم إرسال ${quantity}x ${selectedGift.name_ar}!`
          : `Sent ${quantity}x ${selectedGift.name_en}!`
      );
      onClose();
    } catch (error) {
      console.error('Error sending gift:', error);
      toast.error(lang === 'ar' ? 'فشل إرسال الهدية' : 'Failed to send gift');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      
      <div className="relative w-full max-w-lg max-h-[80vh] bg-card rounded-t-3xl sm:rounded-3xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">
              {lang === 'ar' ? 'إرسال هدية' : 'Send Gift'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {lang === 'ar' ? `إلى ${receiverName}` : `To ${receiverName}`}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Balance */}
        <div className="flex items-center justify-center gap-4 p-3 bg-muted/50">
          <span className="text-sm text-muted-foreground">
            {lang === 'ar' ? 'رصيدك:' : 'Balance:'}
          </span>
          <span className="font-bold text-gold">💰 {profile?.points.toLocaleString() || 0}</span>
        </div>

        {/* Categories */}
        <div className="flex gap-2 p-3 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors",
                activeCategory === cat
                  ? "gradient-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {cat === 'all' ? (lang === 'ar' ? 'الكل' : 'All') : cat}
            </button>
          ))}
        </div>

        {/* Gifts Grid */}
        <div className="p-4 overflow-y-auto max-h-60">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {filteredGifts.map((gift) => (
                <button
                  key={gift.id}
                  onClick={() => {
                    setSelectedGift(gift);
                    setQuantity(1);
                  }}
                  className={cn(
                    "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1",
                    selectedGift?.id === gift.id
                      ? "border-primary bg-primary/10 scale-105"
                      : `${rarityColors[gift.rarity as keyof typeof rarityColors]} bg-muted/50 hover:bg-muted`
                  )}
                >
                  <span className="text-3xl">{gift.image_url}</span>
                  <span className="text-xs truncate w-full text-center">
                    {lang === 'ar' ? gift.name_ar : gift.name_en}
                  </span>
                  <span className="text-xs text-gold font-semibold">
                    {gift.price_points}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Gift & Send */}
        {selectedGift && (
          <div className="p-4 border-t border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedGift.image_url}</span>
                <div>
                  <p className="font-semibold">
                    {lang === 'ar' ? selectedGift.name_ar : selectedGift.name_en}
                  </p>
                  <p className="text-sm text-gold">
                    {selectedGift.price_points} × {quantity} = {totalCost}
                  </p>
                </div>
              </div>
              
              {/* Quantity */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-8 text-center font-bold">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Button
              onClick={handleSendGift}
              disabled={!canAfford || sending}
              className="w-full gradient-primary gap-2"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : canAfford ? (
                <>
                  🎁 {lang === 'ar' ? 'إرسال' : 'Send'} ({totalCost})
                </>
              ) : (
                lang === 'ar' ? 'رصيد غير كافٍ' : 'Insufficient balance'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GiftModal;
