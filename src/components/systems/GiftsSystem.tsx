import React from 'react';

// Mock gift data
const gifts = [
    { id: 1, name: 'Teddy Bear', sent: false },
    { id: 2, name: 'Chocolate Box', sent: false },
    { id: 3, name: 'Flower Bouquet', sent: false },
];

const GiftsSystem = () => {
    const [sentGifts, setSentGifts] = React.useState([]);
    const [notification, setNotification] = React.useState('');

    const sendGift = (gift) => {
        // Simulating sending a gift
        setSentGifts([...sentGifts, gift]);
        setNotification(`Gift '${gift.name}' has been sent!`);
        // Mark the gift as sent
        gift.sent = true;
    };

    return (
        <div>
            <h1>Gifts System</h1>
            <div>
                {gifts.map((gift) => (
                    <div key={gift.id}>
                        <span>{gift.name}</span>
                        <button onClick={() => sendGift(gift)} disabled={gift.sent}>Send Gift</button>
                    </div>
                ))}
            </div>
            {notification && <div className="notification">{notification}</div>}
            <h2>Sent Gifts</h2>
            <ul>
                {sentGifts.map((gift) => (
                    <li key={gift.id}>{gift.name}</li>
                ))}
            </ul>
        </div>
    );
};

export default GiftsSystem;
