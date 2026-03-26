import React from 'react';
import { renderPieceSymbol } from '../engine/rules';

interface PrisonCampProps {
  deadWhite: string[];
  deadBlack: string[];
}

export const PrisonCamp: React.FC<PrisonCampProps> = ({ deadWhite, deadBlack }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', minHeight: '30px' }}>
        {deadWhite.map((p, i) => (
          <span key={i} style={{fontSize: '24px', color: '#fff', opacity: 0.8}}>{renderPieceSymbol(p)}</span>
        ))}
      </div>
      <div style={{ borderTop: '1px solid #444' }}></div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', minHeight: '30px' }}>
        {deadBlack.map((p, i) => (
          <span key={i} style={{fontSize: '24px', color: '#000', opacity: 0.8}}>{renderPieceSymbol(p)}</span>
        ))}
      </div>
    </div>
  );
};
