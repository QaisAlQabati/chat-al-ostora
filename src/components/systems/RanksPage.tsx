import React from 'react';

const ranks = [
    { rank: "Private", symbol: "★", details: "Entry-level rank." },
    { rank: "Corporal", symbol: "★★", details: "Junior non-commissioned officer." },
    { rank: "Sergeant", symbol: "★★★", details: "Non-commissioned officer." },
    { rank: "Lieutenant", symbol: "★★★★", details: "Junior officer." },
    { rank: "Captain", symbol: "★★★★★", details: "Mid-level officer." },
    { rank: "Major", symbol: "★★★★★★", details: "Senior officer." },
    { rank: "Colonel", symbol: "★★★★★★★", details: "High-ranking officer." },
    { rank: "Brigadier", symbol: "★★★★★★★★", details: "Senior officer of the rank of Brigadier." },
    { rank: "General", symbol: "★★★★★★★★★", details: "Highest rank in the army." },
    { rank: "Commander", symbol: "★★★★★★★★★★", details: "Leader of military formations." },
];

const RanksPage: React.FC = () => {
    return (
        <div>
            <h1>Ranks System</h1>
            <ul>
                {ranks.map((rank) => (
                    <li key={rank.rank}>
                        <h2>{rank.symbol} {rank.rank}</h2>
                        <p>{rank.details}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default RanksPage;