import React from 'react';

const RichThroneModal = () => {
    // Mock data for the top 50 richest members
    const richestMembers = [
        { name: 'Member 1', rubyCount: 100 },
        { name: 'Member 2', rubyCount: 200 },
        { name: 'Member 3', rubyCount: 150 },
        // ... add more members up to 50
    ];

    return (
        <div>
            <h2>عرش الأثرياء</h2>
            <ul>
                {richestMembers.map((member, index) => (
                    <li key={index}>{member.name} - Ruby Count: Hidden</li>
                ))}
            </ul>
        </div>
    );
};

export default RichThroneModal;