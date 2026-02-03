import React, { useState, useRef } from 'react';
import { X, Camera, Image, Upload, Loader2, Type, Palette } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface AddStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const backgroundColors = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  '#1a1a2e',
  '#2d3436',
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#9b59b6',
  '#f39c12',
];

const textColors = [
  '#ffffff',
  '#000000',
  '#ff6b6b',
  '#feca57',
  '#48dbfb',
  '#ff9ff3',
  '#54a0ff',
  '#5f27cd',
];

const AddStoryModal: React.FC<AddStoryModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [storyType, setStoryType] = useState<'media' | 'text'>('media');
  
  // Text story options
  const [textContent, setTextContent] = useState('');
  const [backgroundColor, setBackgroundColor] = useState(backgroundColors[0]);
  const [textColor, setTextColor] = useState('#ffffff');
  
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
    if (!user) return;

    if (storyType === 'text' && !textContent.trim()) {
      toast.error(lang === 'ar' ? 'اكتب نص القصة' : 'Enter story text');
      return;
    }

    if (storyType === 'media' && !selectedFile) {
      toast.error(lang === 'ar' ? 'اختر صورة أو فيديو' : 'Select image or video');
      return;
    }

    setUploading(true);
    try {
      let mediaUrl = '';
      let mediaType = 'text';

      if (storyType === 'media' && selectedFile) {
        // Upload to storage
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('stories')
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('stories')
          .getPublicUrl(fileName);

        mediaUrl = publicUrl;
        mediaType = selectedFile.type.startsWith('video') ? 'video' : 'image';
      } else {
        // For text stories, create a data URL with the styling info
        const storyData = JSON.stringify({
          type: 'text',
          content: textContent,
          backgroundColor,
          textColor,
        });
        mediaUrl = `data:application/json;base64,${btoa(unescape(encodeURIComponent(storyData)))}`;
        mediaType = 'text';
      }

      // Create story record
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { error: insertError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: mediaUrl,
          media_type: mediaType,
          caption: storyType === 'media' ? caption : textContent,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) throw insertError;

      toast.success(lang === 'ar' ? 'تم نشر الاستوري بنجاح!' : 'Story posted successfully!');
      onSuccess();
      onClose();
      
      // Reset state
      setSelectedFile(null);
      setPreview(null);
      setCaption('');
      setTextContent('');
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
            disabled={uploading || (storyType === 'media' && !selectedFile) || (storyType === 'text' && !textContent.trim())}
            className="gradient-primary"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              lang === 'ar' ? 'نشر' : 'Post'
            )}
          </Button>
        </div>

        {/* Story Type Tabs */}
        <Tabs value={storyType} onValueChange={(v) => setStoryType(v as 'media' | 'text')} className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="media" className="flex-1 gap-2">
              <Image className="w-4 h-4" />
              {lang === 'ar' ? 'صورة/فيديو' : 'Photo/Video'}
            </TabsTrigger>
            <TabsTrigger value="text" className="flex-1 gap-2">
              <Type className="w-4 h-4" />
              {lang === 'ar' ? 'نص' : 'Text'}
            </TabsTrigger>
          </TabsList>

          {/* Media Story */}
          <TabsContent value="media" className="flex-1 flex flex-col items-center justify-center p-4">
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
          </TabsContent>

          {/* Text Story */}
          <TabsContent value="text" className="flex-1 flex flex-col p-4">
            {/* Preview */}
            <div 
              className="w-full max-w-md mx-auto aspect-[9/16] rounded-2xl flex items-center justify-center p-6 mb-4"
              style={{ background: backgroundColor }}
            >
              <p 
                className="text-2xl font-bold text-center break-words max-w-full"
                style={{ color: textColor }}
              >
                {textContent || (lang === 'ar' ? 'اكتب قصتك هنا...' : 'Write your story here...')}
              </p>
            </div>

            {/* Text Input */}
            <Textarea
              placeholder={lang === 'ar' ? 'اكتب قصتك...' : 'Write your story...'}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="mb-4"
              rows={3}
              maxLength={500}
            />

            {/* Background Color Selection */}
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                {lang === 'ar' ? 'لون الخلفية' : 'Background Color'}
              </p>
              <div className="flex flex-wrap gap-2">
                {backgroundColors.map((color, i) => (
                  <button
                    key={i}
                    onClick={() => setBackgroundColor(color)}
                    className={`w-10 h-10 rounded-xl transition-all ${
                      backgroundColor === color ? 'ring-2 ring-primary scale-110' : ''
                    }`}
                    style={{ background: color }}
                  />
                ))}
              </div>
            </div>

            {/* Text Color Selection */}
            <div>
              <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                <Type className="w-4 h-4" />
                {lang === 'ar' ? 'لون النص' : 'Text Color'}
              </p>
              <div className="flex flex-wrap gap-2">
                {textColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setTextColor(color)}
                    className={`w-10 h-10 rounded-xl border-2 transition-all ${
                      textColor === color ? 'border-primary scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AddStoryModal;
