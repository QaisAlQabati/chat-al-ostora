import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Crown, Trophy, Timer, Swords, Gift } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface PKBattle {
  id: string;
  room_id: string;
  battle_type: string;
  status: string;
  duration_seconds: number;
  started_at: string | null;
  team_a_users: string[];
  team_b_users: string[];
  team_a_points: number;
  team_b_points: number;
  winner_team: string | null;
}

interface TeamMember {
  user_id: string;
  display_name: string;
  profile_picture: string | null;
}

interface PKBattleOverlayProps {
  battle: PKBattle;
  teamAMembers: TeamMember[];
  teamBMembers: TeamMember[];
  onBattleEnd?: (winner: string) => void;
}

const PKBattleOverlay: React.FC<PKBattleOverlayProps> = ({
  battle,
  teamAMembers,
  teamBMembers,
  onBattleEnd,
}) => {
  const { lang } = useLanguage();
  const [timeLeft, setTimeLeft] = useState(battle.duration_seconds);

  useEffect(() => {
    if (battle.status !== 'active' || !battle.started_at) return;

    const startTime = new Date(battle.started_at).getTime();
    const endTime = startTime + battle.duration_seconds * 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        // Determine winner
        let winner = 'draw';
        if (battle.team_a_points > battle.team_b_points) {
          winner = 'A';
        } else if (battle.team_b_points > battle.team_a_points) {
          winner = 'B';
        }
        onBattleEnd?.(winner);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [battle]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalPoints = battle.team_a_points + battle.team_b_points || 1;
  const teamAPercentage = (battle.team_a_points / totalPoints) * 100;
  const teamBPercentage = (battle.team_b_points / totalPoints) * 100;

  const isTeamAWinning = battle.team_a_points > battle.team_b_points;
  const isTeamBWinning = battle.team_b_points > battle.team_a_points;
  const isTie = battle.team_a_points === battle.team_b_points;

  if (battle.status === 'ended') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="text-center space-y-6">
          <Trophy className="w-24 h-24 mx-auto text-yellow-400 animate-bounce-in" />
          
          <h2 className="text-4xl font-bold text-white">
            {battle.winner_team === 'draw'
              ? (lang === 'ar' ? 'تعادل!' : 'Draw!')
              : (lang === 'ar' ? 'الفائز!' : 'Winner!')}
          </h2>

          {battle.winner_team && battle.winner_team !== 'draw' && (
            <div className="flex justify-center gap-4">
              {(battle.winner_team === 'A' ? teamAMembers : teamBMembers).map((member) => (
                <div key={member.user_id} className="flex flex-col items-center">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-yellow-400">
                      {member.profile_picture ? (
                        <img src={member.profile_picture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold">
                          {member.display_name[0]}
                        </div>
                      )}
                    </div>
                    <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 text-yellow-400" />
                  </div>
                  <span className="text-white font-bold mt-2">{member.display_name}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-center gap-8 text-white">
            <div className="text-center">
              <span className="text-pink-400 font-bold text-2xl">{battle.team_a_points}</span>
              <p className="text-sm text-white/60">{lang === 'ar' ? 'الفريق أ' : 'Team A'}</p>
            </div>
            <div className="text-center">
              <span className="text-blue-400 font-bold text-2xl">{battle.team_b_points}</span>
              <p className="text-sm text-white/60">{lang === 'ar' ? 'الفريق ب' : 'Team B'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-20 left-0 right-0 z-20 px-4">
      {/* Timer */}
      <div className="flex justify-center mb-4">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
          <Swords className="w-5 h-5 text-red-400 animate-pulse" />
          <span className="text-white font-bold text-lg">PK</span>
          <div className="w-px h-4 bg-white/30" />
          <Timer className="w-4 h-4 text-yellow-400" />
          <span className={cn(
            "font-mono font-bold text-lg",
            timeLeft <= 30 ? "text-red-400" : "text-white"
          )}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-8 rounded-full overflow-hidden bg-black/40 backdrop-blur-sm">
        {/* Team A Progress (Left) */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 transition-all duration-500",
            "bg-gradient-to-r from-pink-500 to-pink-400"
          )}
          style={{ width: `${teamAPercentage}%` }}
        />
        
        {/* Team B Progress (Right) */}
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 transition-all duration-500",
            "bg-gradient-to-l from-blue-500 to-blue-400"
          )}
          style={{ width: `${teamBPercentage}%` }}
        />

        {/* Center Divider */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 bg-white z-10" />

        {/* Points Display */}
        <div className="absolute inset-0 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-white" />
            <span className="text-white font-bold">{battle.team_a_points}</span>
            {isTeamAWinning && <Crown className="w-4 h-4 text-yellow-400" />}
          </div>
          <div className="flex items-center gap-2">
            {isTeamBWinning && <Crown className="w-4 h-4 text-yellow-400" />}
            <span className="text-white font-bold">{battle.team_b_points}</span>
            <Gift className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="flex justify-between mt-3">
        {/* Team A */}
        <div className="flex -space-x-2">
          {teamAMembers.map((member) => (
            <div
              key={member.user_id}
              className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-pink-500 bg-pink-500"
            >
              {member.profile_picture ? (
                <img src={member.profile_picture} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold">
                  {member.display_name[0]}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Team B */}
        <div className="flex -space-x-2">
          {teamBMembers.map((member) => (
            <div
              key={member.user_id}
              className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-blue-500 bg-blue-500"
            >
              {member.profile_picture ? (
                <img src={member.profile_picture} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold">
                  {member.display_name[0]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PKBattleOverlay;
