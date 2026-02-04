import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface PrivateChatLockProps {
  onUnlock: () => void;
}

const PrivateChatLock: React.FC<PrivateChatLockProps> = ({ onUnlock }) => {
  const { lang } = useLanguage();
  const { profile } = useAuth();
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const handleUnlock = () => {
    if (password === profile?.private_chat_password) {
      onUnlock();
      setIsOpen(false);
      toast.success(lang === 'ar' ? 'تم فتح القفل' : 'Unlocked');
    } else {
      toast.error(lang === 'ar' ? 'كلمة السر غير صحيحة' : 'Incorrect password');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            {lang === 'ar' ? 'الخاص مقفل' : 'Private Messages Locked'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {lang === 'ar' 
              ? 'أدخل كلمة السر لعرض رسائلك الخاصة'
              : 'Enter your password to view your private messages'}
          </p>
          
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={lang === 'ar' ? 'كلمة السر...' : 'Password...'}
              className="pr-10"
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          
          <Button onClick={handleUnlock} className="w-full">
            {lang === 'ar' ? 'فتح' : 'Unlock'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrivateChatLock;
