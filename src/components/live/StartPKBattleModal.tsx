import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Swords, Users, Timer, Play, Loader2 } from 'lucide-react';

interface StartPKBattleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (config: PKBattleConfig) => void;
  availableGuests: Array<{
    user_id: string;
    display_name: string;
    profile_picture: string | null;
  }>;
}

interface PKBattleConfig {
  battleType: '1v1' | '2v2';
  duration: number;
  teamA: string[];
  teamB: string[];
}

const StartPKBattleModal: React.FC<StartPKBattleModalProps> = ({
  isOpen,
  onClose,
  onStart,
  availableGuests,
}) => {
  const { lang } = useLanguage();
  const [battleType, setBattleType] = useState<'1v1' | '2v2'>('1v1');
  const [duration, setDuration] = useState(180);
  const [teamA, setTeamA] = useState<string[]>([]);
  const [teamB, setTeamB] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const requiredPerTeam = battleType === '1v1' ? 1 : 2;

  const toggleTeamMember = (team: 'A' | 'B', userId: string) => {
    if (team === 'A') {
      if (teamA.includes(userId)) {
        setTeamA(teamA.filter((id) => id !== userId));
      } else if (teamA.length < requiredPerTeam) {
        setTeamA([...teamA, userId]);
        setTeamB(teamB.filter((id) => id !== userId));
      }
    } else {
      if (teamB.includes(userId)) {
        setTeamB(teamB.filter((id) => id !== userId));
      } else if (teamB.length < requiredPerTeam) {
        setTeamB([...teamB, userId]);
        setTeamA(teamA.filter((id) => id !== userId));
      }
    }
  };

  const handleStart = async () => {
    if (teamA.length !== requiredPerTeam || teamB.length !== requiredPerTeam) {
      return;
    }

    setLoading(true);
    try {
      await onStart({
        battleType,
        duration,
        teamA,
        teamB,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} ${lang === 'ar' ? 'دقيقة' : 'min'}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-red-500" />
            {lang === 'ar' ? 'بدء لعبة الأحكام' : 'Start PK Battle'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Battle Type */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {lang === 'ar' ? 'نوع المواجهة' : 'Battle Type'}
            </Label>
            <RadioGroup
              value={battleType}
              onValueChange={(v) => {
                setBattleType(v as '1v1' | '2v2');
                setTeamA([]);
                setTeamB([]);
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1v1" id="1v1" />
                <Label htmlFor="1v1" className="cursor-pointer">
                  1 vs 1
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="2v2" id="2v2" />
                <Label htmlFor="2v2" className="cursor-pointer">
                  2 vs 2
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Duration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Timer className="w-4 h-4" />
                {lang === 'ar' ? 'مدة اللعبة' : 'Duration'}
              </Label>
              <span className="text-sm font-bold text-primary">{formatDuration(duration)}</span>
            </div>
            <Slider
              value={[duration]}
              onValueChange={([value]) => setDuration(value)}
              min={60}
              max={300}
              step={30}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 min</span>
              <span>3 min</span>
              <span>5 min</span>
            </div>
          </div>

          {/* Team Selection */}
          <div className="space-y-4">
            <Label>{lang === 'ar' ? 'اختر اللاعبين' : 'Select Players'}</Label>
            
            {availableGuests.length < requiredPerTeam * 2 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {lang === 'ar'
                    ? `تحتاج ${requiredPerTeam * 2} لاعبين على الأقل على المايك`
                    : `Need at least ${requiredPerTeam * 2} players on mic`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {/* Team A */}
                <div className="space-y-2">
                  <div className="text-center py-1 px-2 bg-pink-500/20 rounded-lg">
                    <span className="text-sm font-bold text-pink-400">
                      {lang === 'ar' ? 'الفريق أ' : 'Team A'}
                    </span>
                    <span className="text-xs text-pink-400/60 ml-1">
                      ({teamA.length}/{requiredPerTeam})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {availableGuests.map((guest) => (
                      <button
                        key={`a-${guest.user_id}`}
                        onClick={() => toggleTeamMember('A', guest.user_id)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
                          teamA.includes(guest.user_id)
                            ? 'bg-pink-500/30 ring-2 ring-pink-500'
                            : teamB.includes(guest.user_id)
                            ? 'opacity-50'
                            : 'bg-muted/50 hover:bg-muted'
                        }`}
                        disabled={teamB.includes(guest.user_id)}
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden">
                          {guest.profile_picture ? (
                            <img
                              src={guest.profile_picture}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                              {guest.display_name[0]}
                            </div>
                          )}
                        </div>
                        <span className="text-sm truncate">{guest.display_name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Team B */}
                <div className="space-y-2">
                  <div className="text-center py-1 px-2 bg-blue-500/20 rounded-lg">
                    <span className="text-sm font-bold text-blue-400">
                      {lang === 'ar' ? 'الفريق ب' : 'Team B'}
                    </span>
                    <span className="text-xs text-blue-400/60 ml-1">
                      ({teamB.length}/{requiredPerTeam})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {availableGuests.map((guest) => (
                      <button
                        key={`b-${guest.user_id}`}
                        onClick={() => toggleTeamMember('B', guest.user_id)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
                          teamB.includes(guest.user_id)
                            ? 'bg-blue-500/30 ring-2 ring-blue-500'
                            : teamA.includes(guest.user_id)
                            ? 'opacity-50'
                            : 'bg-muted/50 hover:bg-muted'
                        }`}
                        disabled={teamA.includes(guest.user_id)}
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden">
                          {guest.profile_picture ? (
                            <img
                              src={guest.profile_picture}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                              {guest.display_name[0]}
                            </div>
                          )}
                        </div>
                        <span className="text-sm truncate">{guest.display_name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Start Button */}
          <Button
            onClick={handleStart}
            disabled={
              loading ||
              teamA.length !== requiredPerTeam ||
              teamB.length !== requiredPerTeam
            }
            className="w-full gap-2 bg-gradient-to-r from-pink-500 to-purple-500"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {lang === 'ar' ? 'بدء المواجهة' : 'Start Battle'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StartPKBattleModal;
