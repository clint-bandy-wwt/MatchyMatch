// src/components/poker/PokerBoard.jsx
import { useState, useCallback } from 'react';
import { createDeck, shuffleDeck, dealCards, sortHand, evaluateHand } from '../../data/pokerCards';
import './Poker.css';

function Card({ card, onClick, selected }) {
  const isRed = card.suit === '♥' || card.suit === '♦';

  return (
    <button
      onClick={onClick}
      className={`poker-card ${selected ? 'poker-card--selected' : ''}`}
      style={{
        color: isRed ? '#e31c79' : '#1c0087',
      }}
    >
      <div className="poker-card__rank">{card.rank}</div>
      <div className="poker-card__suit">{card.suit}</div>
      <div className="poker-card__rank poker-card__rank--bottom">{card.rank}</div>
    </button>
  );
}

function HandEvaluation({ evaluation }) {
  if (!evaluation) return null;

  const getRankColor = (rank) => {
    if (rank >= 9) return '#34c759'; // Royal/Straight Flush
    if (rank >= 7) return '#0086ea'; // Four of a kind, Full house
    if (rank >= 5) return '#8212c4'; // Flush, Straight
    if (rank >= 3) return '#c33d04'; // Three of a kind, Two pair
    return '#4e4f5f'; // One pair, High card
  };

  return (
    <div
      className="hand-evaluation"
      style={{
        background: `linear-gradient(140deg, ${getRankColor(evaluation.rank)}, ${getRankColor(evaluation.rank)}dd)`,
      }}
    >
      <div className="hand-evaluation__name">{evaluation.name}</div>
      <div className="hand-evaluation__rank">Rank: {evaluation.rank}/10</div>
    </div>
  );
}

export default function PokerBoard() {
  const [deck, setDeck] = useState(() => shuffleDeck(createDeck()));
  const [hand, setHand] = useState([]);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [evaluation, setEvaluation] = useState(null);
  const [gameState, setGameState] = useState('initial'); // 'initial', 'playing', 'evaluated'

  const dealNewHand = useCallback(() => {
    const newDeck = shuffleDeck(createDeck());
    const { dealtCards, remainingDeck } = dealCards(newDeck, 5);
    const sortedHand = sortHand(dealtCards); // Auto-sort with aces high
    setDeck(remainingDeck);
    setHand(sortedHand);
    setSelectedCards(new Set());
    setEvaluation(null);
    setGameState('playing');
  }, []);

  const toggleCardSelection = useCallback((index) => {
    setSelectedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const replaceSelectedCards = useCallback(() => {
    if (selectedCards.size === 0) return;

    const { dealtCards, remainingDeck } = dealCards(deck, selectedCards.size);
    const newHand = hand.map((card, index) => {
      if (selectedCards.has(index)) {
        return dealtCards[Array.from(selectedCards).indexOf(index)];
      }
      return card;
    });

    const sortedHand = sortHand(newHand); // Auto-sort after replacement
    setDeck(remainingDeck);
    setHand(sortedHand);
    setSelectedCards(new Set());
  }, [deck, hand, selectedCards]);

  const evaluateCurrentHand = useCallback(() => {
    const result = evaluateHand(hand);
    setEvaluation(result);
    setGameState('evaluated');
  }, [hand]);

  return (
    <div className="poker-board">
      {/* Title */}
      <div className="poker-header">
        <h2 className="poker-title">Poker Hand</h2>
        <p className="poker-subtitle">
          Cards are automatically sorted with Aces high
        </p>
      </div>

      {/* Initial state */}
      {gameState === 'initial' && (
        <div className="poker-welcome">
          <div className="poker-welcome__icon">🃏</div>
          <h3 className="poker-welcome__title">Welcome to Poker Hand</h3>
          <p className="poker-welcome__text">
            Get dealt 5 cards, automatically sorted with Aces high.
            Select cards to replace, then evaluate your hand!
          </p>
          <button onClick={dealNewHand} className="btn-primary">
            Deal Hand
          </button>
        </div>
      )}

      {/* Playing state */}
      {gameState === 'playing' && (
        <>
          <div className="poker-hand">
            {hand.map((card, index) => (
              <Card
                key={card.id}
                card={card}
                selected={selectedCards.has(index)}
                onClick={() => toggleCardSelection(index)}
              />
            ))}
          </div>

          <div className="poker-info">
            <p className="poker-info__text">
              {selectedCards.size === 0
                ? 'Select cards to replace, or evaluate your hand'
                : `${selectedCards.size} card${selectedCards.size > 1 ? 's' : ''} selected`}
            </p>
          </div>

          <div className="poker-actions">
            {selectedCards.size > 0 && (
              <button onClick={replaceSelectedCards} className="btn-secondary">
                Replace Selected ({selectedCards.size})
              </button>
            )}
            <button onClick={evaluateCurrentHand} className="btn-primary">
              Evaluate Hand
            </button>
          </div>
        </>
      )}

      {/* Evaluated state */}
      {gameState === 'evaluated' && (
        <>
          <div className="poker-hand">
            {hand.map((card) => (
              <Card key={card.id} card={card} onClick={() => {}} selected={false} />
            ))}
          </div>

          <HandEvaluation evaluation={evaluation} />

          <div className="poker-actions">
            <button onClick={dealNewHand} className="btn-primary">
              Deal New Hand
            </button>
          </div>
        </>
      )}

      {/* Instructions */}
      {gameState !== 'initial' && (
        <div className="poker-instructions">
          <h4 className="poker-instructions__title">How to Play</h4>
          <ul className="poker-instructions__list">
            <li>Cards are automatically sorted by value (Aces high)</li>
            <li>Click cards to select them for replacement</li>
            <li>Click "Replace Selected" to draw new cards</li>
            <li>Click "Evaluate Hand" to see your poker hand rank</li>
          </ul>
        </div>
      )}
    </div>
  );
}
