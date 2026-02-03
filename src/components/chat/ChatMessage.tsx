import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, Shield, Star, Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

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
  };
  onMention: (name: string) => void;
  onOpenProfile: (userId: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onMention, onOpenProfile }) => {
  const { lang } = useLanguage();
  const isSystem = message.message_type === 'system' || message.message_type === 'announcement';

  // Get role icon and color
  const getRoleDisplay = (role?: string) => {
    switch (role) {
      case 'super_owner':
      case 'owner':
        return { icon: Trophy, color: '#f59e0b', label: 'Owner' };
      case 'super_admin':
        return { icon: Crown, color: '#ec4899', label: 'Super Admin' };
      case 'admin':
        return { icon: Shield, color: '#8b5cf6', label: 'Admin' };
      case 'moderator':
        return { icon: Star, color: '#3b82f6', label: 'Moderator' };
      case 'vip':
        return { icon: Star, color: '#fbbf24', label: 'VIP' };
      default:
        return null;
    }
  };

  const roleDisplay = getRoleDisplay(message.senderRole);
  
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

  // Parse mentions in content (text wrapped in @[name])
  const renderContent = (content: string) => {
    const mentionRegex = /@\[([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push(
          <span key={lastIndex}>{content.slice(lastIndex, match.index)}</span>
        );
      }
      // Add the mention with yellow highlight
      parts.push(
        <span key={match.index} className="text-yellow-400 font-medium">
          @{match[1]}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(<span key={lastIndex}>{content.slice(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : content;
  };

  return (
    <div className="flex items-start gap-2 py-1.5 px-2 hover:bg-muted/20 rounded-lg group transition-colors">
      {/* Arrow indicator */}
      <span className="text-muted-foreground mt-1 text-xs">•••</span>
      
      {/* Avatar - clicking opens profile */}
      <Avatar 
        className="w-8 h-8 cursor-pointer flex-shrink-0 hover:ring-2 hover:ring-primary transition-all"
        onClick={() => onOpenProfile(message.sender_id)}
      >
        <AvatarImage src={message.sender?.profile_picture || undefined} />
        <AvatarFallback className="text-xs">
          {message.sender?.display_name?.[0] || '?'}
        </AvatarFallback>
      </Avatar>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          {/* Name with background - clicking adds mention */}
          <span
            className="px-2 py-0.5 rounded-md text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity"
            style={{ 
              backgroundColor: nameBackground !== 'transparent' ? nameBackground : 'hsl(var(--muted))',
              color: nameColor 
            }}
            onClick={() => onMention(message.sender?.display_name || '')}
          >
            {message.sender?.display_name}
          </span>

          {/* Role badge */}
          {roleDisplay && (
            <span 
              className="px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-0.5"
              style={{ 
                backgroundColor: `${roleDisplay.color}20`,
                color: roleDisplay.color 
              }}
            >
              <roleDisplay.icon className="w-3 h-3" />
              {roleDisplay.label}
            </span>
          )}

          {/* VIP/Verified badges */}
          {message.sender?.is_vip && (
            <Crown className="w-4 h-4 text-yellow-500" />
          )}
          {message.sender?.is_verified && (
            <Shield className="w-4 h-4 text-blue-500" />
          )}

          {/* Colon separator */}
          <span className="text-muted-foreground">:</span>
        </div>

        {/* Message text */}
        <p 
          className="text-sm mt-0.5 break-words whitespace-pre-wrap"
          style={{ color: fontColor }}
        >
          {renderContent(message.content)}
        </p>
      </div>

      {/* Timestamp */}
      <span className="text-[10px] text-muted-foreground mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {new Date(message.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    </div>
  );
};

export default ChatMessage;
