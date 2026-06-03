import React, { useState } from 'react';
import './ColorPicker.css';

const ColorPicker = () => {
    const [backgroundColor, setBackgroundColor] = useState('#ffffff');
    const [textColor, setTextColor] = useState('#000000');

    return (
        <div className="color-picker" style={{ backgroundColor: backgroundColor, color: textColor }}>
            <h2>Personnalisez les couleurs</h2>
            <label>
                Couleur de fond:
                <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} />
            </label>
            <label>
                Couleur du texte:
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
            </label>
            <div className="preview">
                <p>Aperçu de votre sélection</p>
            </div>
        </div>
    );
};

export default ColorPicker;