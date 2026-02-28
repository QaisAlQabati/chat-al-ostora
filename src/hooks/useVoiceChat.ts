import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PeerConnection {
  peerId: string;
  pc: RTCPeerConnection;
  stream?: MediaStream;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

export const useVoiceChat = (roomId: string | undefined, isOnMic: boolean) => {
  const { user } = useAuth();
  const localStreamRef    = useRef<MediaStream | null>(null);
  const peersRef          = useRef<Map<string, PeerConnection>>(new Map());
  const channelRef        = useRef<any>(null);
  const audioElementsRef  = useRef<Map<string, HTMLAudioElement>>(new Map());
  const mutedPeersRef     = useRef<Set<string>>(new Set());
  const channelReadyRef   = useRef<boolean>(false);

  const [isMicActive, setIsMicActive]   = useState(false);
  const [micError, setMicError]         = useState<string | null>(null);
  const [mutedPeers, setMutedPeers]     = useState<Set<string>>(new Set());

  // ── بدء التقاط الميكروفون ────────────────────────────────────
  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      localStreamRef.current = stream;
      setIsMicActive(true);
      setMicError(null);
      return stream;
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError'
        ? 'يرجى السماح بالوصول للميكروفون من إعدادات المتصفح'
        : 'تعذر الوصول للميكروفون';
      setMicError(msg);
      return null;
    }
  }, []);

  // ── إيقاف الميكروفون ─────────────────────────────────────────
  const stopMic = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setIsMicActive(false);
  }, []);

  // ── كتم/فك كتم شخص معين من عندك أنت فقط ────────────────────
  const togglePeerMute = useCallback((peerId: string) => {
    setMutedPeers(prev => {
      const next = new Set(prev);
      if (next.has(peerId)) {
        next.delete(peerId);
        const el = audioElementsRef.current.get(peerId);
        if (el) el.muted = false;
      } else {
        next.add(peerId);
        const el = audioElementsRef.current.get(peerId);
        if (el) el.muted = true;
      }
      mutedPeersRef.current = next;
      return next;
    });
  }, []);

  // ── إنشاء RTCPeerConnection مع peer ──────────────────────────
  const createPeer = useCallback((peerId: string, isInitiator: boolean) => {
    // إذا في اتصال قديم، أغلقه أولاً
    const existing = peersRef.current.get(peerId);
    if (existing) {
      existing.pc.close();
      peersRef.current.delete(peerId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // أضف تراكات الصوت المحلي
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // استقبل تراكات الصوت من الطرف الآخر
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      let audio = audioElementsRef.current.get(peerId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audioElementsRef.current.set(peerId, audio);
      }
      audio.srcObject = remoteStream;
      audio.muted = mutedPeersRef.current.has(peerId);
      // تأكد إن الصوت يشتغل فعلاً
      audio.play().catch(() => {
        // المتصفح يحتاج تفاعل من المستخدم - حاول مرة ثانية
        const tryPlay = () => {
          audio!.play().catch(() => {});
          document.removeEventListener('click', tryPlay);
        };
        document.addEventListener('click', tryPlay, { once: true });
      });
    };

    // أرسل ICE candidates عبر Supabase Realtime
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            from: user?.id,
            to: peerId,
            candidate: event.candidate,
          },
        });
      }
    };

    // مراقبة حالة الاتصال للـ debugging
    pc.onconnectionstatechange = () => {
      console.log(`[VoiceChat] peer ${peerId} state: ${pc.connectionState}`);
    };

    peersRef.current.set(peerId, { peerId, pc });

    // المبادر يرسل offer
    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          channelRef.current?.send({
            type: 'broadcast',
            event: 'offer',
            payload: {
              from: user?.id,
              to: peerId,
              sdp: pc.localDescription,
            },
          });
        })
        .catch(err => console.error('[VoiceChat] createOffer error:', err));
    }

    return pc;
  }, [user]);

  // ── تنظيف peer ────────────────────────────────────────────────
  const removePeer = useCallback((peerId: string) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      peer.pc.close();
      peersRef.current.delete(peerId);
    }
    const audio = audioElementsRef.current.get(peerId);
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      audioElementsRef.current.delete(peerId);
    }
  }, []);

  // ── إرسال peer-joined بعد ما الـ channel يكون جاهز ──────────
  const broadcastJoined = useCallback(() => {
    if (!user) return;
    const tryBroadcast = (attempts = 0) => {
      if (channelRef.current && channelReadyRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'peer-joined',
          payload: { userId: user.id },
        });
      } else if (attempts < 20) {
        setTimeout(() => tryBroadcast(attempts + 1), 200);
      }
    };
    tryBroadcast();
  }, [user]);

  // ── الاتصال بقناة Supabase Realtime ──────────────────────────
  useEffect(() => {
    if (!roomId || !user) return;

    channelReadyRef.current = false;

    const channel = supabase.channel(`voice_${roomId}`, {
      config: { broadcast: { self: false } },
    });

    channelRef.current = channel;

    channel
      // عندما يدخل شخص جديد على المايك
      .on('broadcast', { event: 'peer-joined' }, ({ payload }) => {
        if (payload.userId === user.id) return;
        if (isOnMic && localStreamRef.current) {
          createPeer(payload.userId, true);
        }
      })

      // استقبال offer
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.to !== user.id) return;
        const pc = createPeer(payload.from, false);
        const peer = peersRef.current.get(payload.from)!;
        await peer.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription(answer);
        channel.send({
          type: 'broadcast',
          event: 'answer',
          payload: { from: user.id, to: payload.from, sdp: peer.pc.localDescription },
        });
      })

      // استقبال answer
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.to !== user.id) return;
        const peer = peersRef.current.get(payload.from);
        if (peer) {
          await peer.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }
      })

      // استقبال ICE candidate
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.to !== user.id) return;
        const peer = peersRef.current.get(payload.from);
        if (peer && payload.candidate) {
          await peer.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      })

      // شخص غادر المايك
      .on('broadcast', { event: 'peer-left' }, ({ payload }) => {
        removePeer(payload.userId);
      })

      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelReadyRef.current = true;
        }
      });

    return () => {
      channelReadyRef.current = false;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, user, isOnMic, createPeer, removePeer]);

  // ── لما يصعد على المايك: شغّل الميكروفون وأعلن للغرفة ───────
  useEffect(() => {
    if (!roomId || !user) return;

    if (isOnMic) {
      startMic().then((stream) => {
        if (stream) {
          broadcastJoined();
        }
      });
    } else {
      // أعلن للغرفة أنك نزلت
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'peer-left',
          payload: { userId: user.id },
        });
      }
      stopMic();
      // أغلق كل الاتصالات
      peersRef.current.forEach((_, peerId) => removePeer(peerId));
    }

    return () => {
      if (!isOnMic) return;
      stopMic();
    };
  }, [isOnMic, roomId, user]);

  return {
    isMicActive,
    micError,
    mutedPeers,
    togglePeerMute,
    stopMic,
  };
};

export default useVoiceChat;
