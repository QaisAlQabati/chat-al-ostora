import React, { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface RoomPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  roomName: string;
}

const RoomPasswordModal: React.FC<RoomPasswordModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  roomName,
}) => {
  const { lang } = useLanguage();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!password.trim()) return;
    setLoading(true);
    await onSubmit(password);
    setLoading(false);
    setPassword('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">
            <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <span className="block">
              {lang === 'ar' ? 'غرفة محمية بكلمة مرور' : 'Password Protected Room'}
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-center text-muted-foreground">
            {lang === 'ar' 
              ? `الغرفة "${roomName}" محمية بكلمة مرور`
              : `Room "${roomName}" is password protected`}
          </p>
          
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={lang === 'ar' ? 'أدخل كلمة المرور' : 'Enter password'}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              className="flex-1 gradient-primary" 
              onClick={handleSubmit}
              disabled={loading || !password.trim()}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                lang === 'ar' ? 'دخول' : 'Enter'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoomPasswordModal;
