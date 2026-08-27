// src/components/canasta/Meld.jsx
import Card from './Card'
import { isCanasta, isNaturalCanasta, getMeldRank } from '../../data/canastaData'

export default function Meld({ meld, onAddCards, canAdd = false }) {
  const isC = isCanasta(meld.cards)
  const isNatural = isNaturalCanasta(meld.cards)
  const rank = getMeldRank(meld.cards)

  return (
    <div className="canasta-meld">
      {isC && (
        <div className={`canasta-meld-badge ${isNatural ? 'natural' : 'mixed'}`}>
          {isNatural ? '⭐ NATURAL CANASTA' : '✨ MIXED CANASTA'}
        </div>
      )}
      <div
        style={{
          fontSize: '12px',
          fontWeight: 'bold',
          color: 'var(--label-secondary)',
          marginBottom: '4px',
        }}
      >
        {rank} ({meld.cards.length} cards)
      </div>
      <div className="canasta-meld-cards">
        {meld.cards.map((card) => (
          <Card key={card.id} card={card} small />
        ))}
      </div>
      {canAdd && onAddCards && (
        <button
          onClick={onAddCards}
          className="canasta-btn canasta-btn-primary"
          style={{ marginTop: '8px', padding: '6px 12px', fontSize: '12px' }}
        >
          Add Cards
        </button>
      )}
    </div>
  )
}
