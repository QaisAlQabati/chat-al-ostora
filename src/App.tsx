import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import BannedScreen from "@/components/common/BannedScreen";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Live from "./pages/Live";
import LiveRoom from "./pages/LiveRoom";
import Messages from "./pages/Messages";
import ChatRoom from "./pages/ChatRoom";
import ChatRooms from "./pages/ChatRooms";
import RoomChat from "./pages/RoomChat";
import Explore from "./pages/Explore";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Posts from "./pages/Posts";
import NotFound from "./pages/NotFound";
import NewsPage from "./pages/NewsPage";

const queryClient = new QueryClient();

// Wrapper component to check ban status
const AppContent = () => {
  const { profile, loading } = useAuth();

  // Show banned screen if user is banned
  if (!loading && profile?.is_banned) {
    return (
      <BannedScreen 
        banReason={profile.ban_reason || undefined}
        banExpiresAt={profile.ban_expires_at || undefined}
      />
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/:userId" element={<Profile />} />
      <Route path="/live" element={<Live />} />
      <Route path="/live/:liveId" element={<LiveRoom />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/messages/:userId" element={<ChatRoom />} />
      <Route path="/rooms" element={<ChatRooms />} />
      <Route path="/rooms/:roomId" element={<RoomChat />} />
      <Route path="/explore" element={<Explore />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/posts" element={<Posts />} />
      <Route path="/news" element={<NewsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
