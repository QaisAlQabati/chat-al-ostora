import React, { useState, useRef } from 'react';
import { X, Camera, Image, Upload, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface AddStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddStoryModal: React.FC<AddStoryModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      // Upload to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);

      // Create story record
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { error: insertError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: publicUrl,
          media_type: selectedFile.type.startsWith('video') ? 'video' : 'image',
          caption,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) throw insertError;

      toast.success(lang === 'ar' ? 'تم نشر الاستوري بنجاح!' : 'Story posted successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error uploading story:', error);
      toast.error(lang === 'ar' ? 'فشل نشر الاستوري' : 'Failed to post story');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 animate-fade-in">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-6 h-6" />
          </Button>
          <h2 className="text-lg font-semibold">{t('addStory')}</h2>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="gradient-primary"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              lang === 'ar' ? 'نشر' : 'Post'
            )}
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          {preview ? (
            <div className="relative w-full max-w-md aspect-[9/16] rounded-2xl overflow-hidden">
              {selectedFile?.type.startsWith('video') ? (
                <video src={preview} className="w-full h-full object-cover" controls />
              ) : (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              )}
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreview(null);
                }}
                className="absolute top-4 right-4 p-2 rounded-full bg-background/50 backdrop-blur-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-48 h-48 rounded-3xl border-2 border-dashed border-primary/50 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary transition-colors"
              >
                <Upload className="w-12 h-12 text-primary" />
                <span className="text-sm text-muted-foreground">
                  {lang === 'ar' ? 'اختر صورة أو فيديو' : 'Choose image or video'}
                </span>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Image className="w-5 h-5" />
                  {lang === 'ar' ? 'معرض' : 'Gallery'}
                </Button>
                <Button variant="outline" className="gap-2">
                  <Camera className="w-5 h-5" />
                  {lang === 'ar' ? 'كاميرا' : 'Camera'}
                </Button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {selectedFile && (
            <div className="w-full max-w-md mt-4">
              <Input
                placeholder={lang === 'ar' ? 'أضف وصفاً...' : 'Add a caption...'}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="bg-muted"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddStoryModal;
