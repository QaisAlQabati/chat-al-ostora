import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, Shield, Star, Trophy, Trash2, Quote, MoreVertical } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    message_type: string;
    created_at: string;
    sender_id: string;
    sender?: {
      display_name: string;
      profile_picture: string | null;
      is_verified: boolean;
      is_vip: boolean;
      vip_type: string | null;
      name_color?: string;
      font_color?: string;
      name_background?: string;
    };
    senderRole?: string;
    reply_to?: {
      id: string;
      content: string;
      sender_name: string;
    };
  };
  onMention: (name: string) => void;
  onOpenProfile: (userId: string) => void;
  onDelete?: (messageId: string) => void;
  onQuote?: (message: any) => void;
  canDelete?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  onMention, 
  onOpenProfile,
  onDelete,
  onQuote,
  canDelete = false
}) => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const isSystem = message.message_type === 'system' || message.message_type === 'announcement';

  // Get role icon and color
  const getRoleDisplay = (role?: string) => {
    switch (role) {
      case 'owner':
      case 'super_owner':
        return { icon: Trophy, color: '#f59e0b', label: lang === 'ar' ? 'مالك' : 'Owner' };
      case 'royal':
        return { icon: Crown, color: '#f59e0b', label: lang === 'ar' ? 'جناح الملوك' : 'Royal' };
      case 'super_admin':
        return { icon: Shield, color: '#ec4899', label: lang === 'ar' ? 'سوبر أدمن' : 'Super Admin' };
      case 'admin':
        return { icon: Shield, color: '#8b5cf6', label: lang === 'ar' ? 'إدارة' : 'Admin' };
      case 'moderator':
        return { icon: Shield, color: '#3b82f6', label: lang === 'ar' ? 'مشرف' : 'Moderator' };
      case 'vip':
        return { icon: Star, color: '#fbbf24', label: 'VIP' };
      default:
        return null;
    }
  };

  const roleDisplay = getRoleDisplay(message.senderRole);
  const isMyMessage = message.sender_id === user?.id;
  
  // Default colors
  const nameColor = message.sender?.name_color || '#ffffff';
  const fontColor = message.sender?.font_color || '#ffffff';
  const nameBackground = message.sender?.name_background || 'transparent';

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <span className={`inline-block px-4 py-1.5 rounded-full text-sm ${
          message.message_type === 'announcement' 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted/50 text-muted-foreground'
        }`}>
          {message.content}
        </span>
      </div>
    );
  }

  // Parse mentions in content
  const renderContent = (content: string) => {
    const mentionRegex = /@\[([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={lastIndex}>{content.slice(lastIndex, match.index)}</span>);
      }
      parts.push(
        <span key={match.index} className="text-yellow-400 font-medium bg-yellow-400/10 px-1 rounded">
          @{match[1]}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(<span key={lastIndex}>{content.slice(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : content;
  };

  return (
    <div className="flex items-start gap-2 py-1.5 px-2 hover:bg-muted/20 rounded-lg group transition-colors relative">
      <Avatar 
        className="w-8 h-8 cursor-pointer flex-shrink-0 hover:ring-2 hover:ring-primary transition-all"
        onClick={() => onOpenProfile(message.sender_id)}
      >
        <AvatarImage src={message.sender?.profile_picture || undefined} />
        <AvatarFallback className="text-xs">
          {message.sender?.display_name?.[0] || '?'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        {/* Quote display */}
        {message.reply_to && (
          <div className="mb-1 p-2 rounded bg-muted/30 border-r-2 border-primary text-xs opacity-80">
            <p className="font-bold text-primary">{message.reply_to.sender_name}</p>
            <p className="truncate">{message.reply_to.content}</p>
          </div>
        )}

        <div className="flex items-center gap-1 flex-wrap">
          <span
            className="px-2 py-0.5 rounded-md text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1"
            style={{ 
              backgroundColor: nameBackground !== 'transparent' ? nameBackground : 'hsl(var(--muted))',
              color: nameColor 
            }}
            onClick={() => onMention(message.sender?.display_name || '')}
          >
            {message.sender?.display_name}
            {message.sender?.is_verified && <Shield className="w-3 h-3 text-blue-500 fill-blue-500" />}
          </span>

          {roleDisplay && (
            <span 
              className="px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 shadow-sm"
              style={{ 
                backgroundColor: `${roleDisplay.color}20`,
                color: roleDisplay.color,
                border: `1px solid ${roleDisplay.color}40`
              }}
            >
              <roleDisplay.icon className="w-2.5 h-2.5" />
              {roleDisplay.label}
            </span>
          )}

          {message.sender?.is_vip && (
            <Crown className="w-3.5 h-3.5 text-yellow-500" />
          )}

          <span className="text-muted-foreground ml-1">:</span>
        </div>

        <p 
          className="text-sm mt-0.5 break-words whitespace-pre-wrap leading-relaxed"
          style={{ color: fontColor }}
        >
          {renderContent(message.content)}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          {new Date(message.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => onQuote?.(message)} className="gap-2">
                <Quote className="w-4 h-4" />
                {lang === 'ar' ? 'رد' : 'Reply'}
              </DropdownMenuItem>
              {(isMyMessage || canDelete) && (
                <DropdownMenuItem 
                  onClick={() => onDelete?.(message.id)} 
                  className="text-destructive gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {lang === 'ar' ? 'حذف' : 'Delete'}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
