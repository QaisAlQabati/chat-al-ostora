import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const AccountSettings: React.FC = () => {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  
  // Email change
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  
  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleChangeEmail = async () => {
    if (!newEmail || !emailPassword) {
      toast.error(lang === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }

    setChangingEmail(true);
    try {
      // First verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: emailPassword,
      });

      if (signInError) {
        toast.error(lang === 'ar' ? 'كلمة المرور غير صحيحة' : 'Incorrect password');
        return;
      }

      // Update email
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      
      if (error) throw error;

      // Update email in profiles table
      await supabase
        .from('profiles')
        .update({ email: newEmail })
        .eq('user_id', user?.id);

      toast.success(
        lang === 'ar' 
          ? 'تم إرسال رابط التأكيد إلى بريدك الجديد' 
          : 'Confirmation link sent to your new email'
      );
      setEmailDialogOpen(false);
      setNewEmail('');
      setEmailPassword('');
    } catch (error: any) {
      console.error('Error changing email:', error);
      toast.error(error.message || (lang === 'ar' ? 'فشل تغيير البريد' : 'Failed to change email'));
    } finally {
      setChangingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(lang === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(lang === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error(lang === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);
    try {
      // First verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        toast.error(lang === 'ar' ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect');
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;

      toast.success(lang === 'ar' ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully');
      setPasswordDialogOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || (lang === 'ar' ? 'فشل تغيير كلمة المرور' : 'Failed to change password'));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {lang === 'ar' ? 'إعدادات الحساب' : 'Account Settings'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Email Display */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">
                {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
              </p>
              <p className="font-medium">{profile?.email || user?.email}</p>
            </div>
          </div>
          <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                {lang === 'ar' ? 'تغيير' : 'Change'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {lang === 'ar' ? 'تغيير البريد الإلكتروني' : 'Change Email'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>{lang === 'ar' ? 'البريد الجديد' : 'New Email'}</Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder={lang === 'ar' ? 'أدخل البريد الجديد' : 'Enter new email'}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{lang === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}</Label>
                  <Input
                    type="password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    placeholder={lang === 'ar' ? 'أدخل كلمة المرور للتأكيد' : 'Enter password to confirm'}
                  />
                </div>
                <Button 
                  onClick={handleChangeEmail} 
                  disabled={changingEmail}
                  className="w-full"
                >
                  {changingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    lang === 'ar' ? 'تغيير البريد' : 'Change Email'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Password Change */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">
                {lang === 'ar' ? 'كلمة المرور' : 'Password'}
              </p>
              <p className="font-medium">••••••••</p>
            </div>
          </div>
          <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                {lang === 'ar' ? 'تغيير' : 'Change'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>{lang === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}</Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={lang === 'ar' ? 'أدخل كلمة المرور الحالية' : 'Enter current password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={lang === 'ar' ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={lang === 'ar' ? 'أعد إدخال كلمة المرور الجديدة' : 'Re-enter new password'}
                  />
                </div>
                <Button 
                  onClick={handleChangePassword} 
                  disabled={changingPassword}
                  className="w-full"
                >
                  {changingPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountSettings;
