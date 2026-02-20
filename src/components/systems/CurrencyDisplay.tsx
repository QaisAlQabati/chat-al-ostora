import React from 'react';

const CurrencyDisplay: React.FC<{ ruby: number; points: number }> = ({ ruby, points }) => {
    return (
        <div>
            <h2>Currency Display</h2>
            <p>Ruby: {ruby}</p>
            <p>Points: {points}</p>
        </div>
    );
};

export default CurrencyDisplay;