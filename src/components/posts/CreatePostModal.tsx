import React, { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Image, Mic, Video, X, Hash, Send, Loader2, 
  Camera, Plus, MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  
  const [content, setContent] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [newHashtag, setNewHashtag] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'text' | 'image' | 'video' | 'audio'>('text');
  const [allowComments, setAllowComments] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(lang === 'ar' ? 'الحد الأقصى 5 ميجابايت' : 'Max 5MB allowed');
        return;
      }
      setMediaFile(file);
      setMediaType('image');
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(lang === 'ar' ? 'الحد الأقصى 50 ميجابايت' : 'Max 50MB allowed');
        return;
      }
      setMediaFile(file);
      setMediaType('video');
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setMediaFile(new File([audioBlob], 'recording.webm', { type: 'audio/webm' }));
        setMediaType('audio');
        setMediaPreview(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error(lang === 'ar' ? 'فشل بدء التسجيل' : 'Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const addHashtag = () => {
    if (newHashtag.trim() && !hashtags.includes(newHashtag.trim().replace('#', ''))) {
      setHashtags([...hashtags, newHashtag.trim().replace('#', '')]);
      setNewHashtag('');
    }
  };

  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter(t => t !== tag));
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType('text');
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!content.trim() && !mediaFile) {
      toast.error(lang === 'ar' ? 'أضف محتوى أو وسائط' : 'Add content or media');
      return;
    }

    setLoading(true);
    try {
      let mediaUrl = null;

      // Upload media if exists
      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(fileName, mediaFile, {
            contentType: mediaFile.type,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-media')
          .getPublicUrl(fileName);
        
        mediaUrl = publicUrl;
      }

      // Extract hashtags from content as well
      const contentHashtags = content.match(/#[\w\u0600-\u06FF]+/g)?.map(tag => tag.replace('#', '')) || [];
      const allHashtags = [...new Set([...hashtags, ...contentHashtags])];

      // Create post
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: content.trim() || null,
          media_url: mediaUrl,
          media_type: mediaType,
          hashtags: allHashtags,
          allow_comments: allowComments,
        });

      if (error) throw error;

      toast.success(lang === 'ar' ? 'تم النشر بنجاح!' : 'Posted successfully!');
      
      // Reset form
      setContent('');
      setHashtags([]);
      setMediaFile(null);
      setMediaPreview(null);
      setMediaType('text');
      setAllowComments(true);
      
      onSuccess();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(lang === 'ar' ? 'فشل النشر' : 'Failed to post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-primary" />
            {lang === 'ar' ? 'إنشاء منشور جديد' : 'Create New Post'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* User info */}
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={profile?.profile_picture || ''} />
              <AvatarFallback>{profile?.display_name?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{profile?.display_name}</p>
              <p className="text-xs text-muted-foreground">@{profile?.username}</p>
            </div>
          </div>

          {/* Content */}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={lang === 'ar' ? 'ماذا يدور في ذهنك؟ استخدم #هاشتاق...' : "What's on your mind? Use #hashtags..."}
            className="min-h-[100px] resize-none"
          />

          {/* Media Preview */}
          {mediaPreview && (
            <div className="relative rounded-lg overflow-hidden bg-muted">
              {mediaType === 'image' && (
                <img src={mediaPreview} alt="" className="w-full max-h-60 object-contain" />
              )}
              {mediaType === 'video' && (
                <video src={mediaPreview} controls className="w-full max-h-60" />
              )}
              {mediaType === 'audio' && (
                <div className="p-4">
                  <audio src={mediaPreview} controls className="w-full" />
                </div>
              )}
              <button
                onClick={clearMedia}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Hashtags */}
          <div className="space-y-2">
            <Label>{lang === 'ar' ? 'الهاشتاقات' : 'Hashtags'}</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {hashtags.map((tag) => (
                <span 
                  key={tag} 
                  className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm flex items-center gap-1"
                >
                  #{tag}
                  <button onClick={() => removeHashtag(tag)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newHashtag}
                onChange={(e) => setNewHashtag(e.target.value)}
                placeholder={lang === 'ar' ? 'أضف هاشتاق...' : 'Add hashtag...'}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
              />
              <Button type="button" variant="outline" onClick={addHashtag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Media buttons */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={imageInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <input
              type="file"
              ref={videoInputRef}
              accept="video/*"
              className="hidden"
              onChange={handleVideoSelect}
            />
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => imageInputRef.current?.click()}
              disabled={!!mediaFile}
            >
              <Image className="w-4 h-4 mr-1" />
              {lang === 'ar' ? 'صورة' : 'Image'}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => videoInputRef.current?.click()}
              disabled={!!mediaFile}
            >
              <Video className="w-4 h-4 mr-1" />
              {lang === 'ar' ? 'فيديو' : 'Video'}
            </Button>
            
            <Button
              type="button"
              variant={isRecording ? 'destructive' : 'outline'}
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!!mediaFile && !isRecording}
            >
              <Mic className={`w-4 h-4 mr-1 ${isRecording ? 'animate-pulse' : ''}`} />
              {isRecording 
                ? (lang === 'ar' ? 'إيقاف' : 'Stop')
                : (lang === 'ar' ? 'صوت' : 'Audio')
              }
            </Button>
          </div>

          {/* Settings */}
          <div className="flex items-center justify-between py-2 border-t">
            <Label className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              {lang === 'ar' ? 'السماح بالتعليقات' : 'Allow Comments'}
            </Label>
            <Switch
              checked={allowComments}
              onCheckedChange={setAllowComments}
            />
          </div>

          {/* Submit */}
          <Button 
            onClick={handleSubmit} 
            className="w-full gradient-primary"
            disabled={loading || (!content.trim() && !mediaFile)}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {lang === 'ar' ? 'نشر' : 'Post'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;
