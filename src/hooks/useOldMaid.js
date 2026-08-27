// src/hooks/useOldMaid.js
import { useState, useCallback, useEffect } from 'react';
import {
  createDeck,
  shuffle,
  dealCards,
  removePairs,
  drawCard,
  checkForPair,
  checkGameOver,
  aiChooseCard
} from '../data/oldMaidData';

const AI_DELAY = 1500; // Delay before AI draws a card

export function useOldMaid() {
  const [playerHand, setPlayerHand] = useState([]);
  const [opponentHand, setOpponentHand] = useState([]);
  const [playerPairs, setPlayerPairs] = useState([]);
  const [opponentPairs, setOpponentPairs] = useState([]);
  const [currentTurn, setCurrentTurn] = useState('player'); // 'player' or 'opponent'
  const [gameState, setGameState] = useState('playing'); // 'playing', 'won', 'lost'
  const [message, setMessage] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState(null);

  // Initialize game
  const initGame = useCallback(() => {
    const deck = shuffle(createDeck());
    const { playerHand: initialPlayerHand, opponentHand: initialOpponentHand } = dealCards(deck);
    
    // Remove initial pairs from both hands
    const { newHand: playerHandAfterPairs, pairs: initialPlayerPairs } = removePairs(initialPlayerHand);
    const { newHand: opponentHandAfterPairs, pairs: initialOpponentPairs } = removePairs(initialOpponentHand);
    
    setPlayerHand(playerHandAfterPairs);
    setOpponentHand(opponentHandAfterPairs);
    setPlayerPairs(initialPlayerPairs);
    setOpponentPairs(initialOpponentPairs);
    setCurrentTurn('player');
    setGameState('playing');
    setMessage('Your turn! Draw a card from your opponent.');
    setIsAIThinking(false);
    setSelectedCardIndex(null);
  }, []);

  // Initialize on mount
  useEffect(() => {
    initGame();
  }, [initGame]);

  // Handle player drawing a card from opponent
  const handlePlayerDraw = useCallback((cardIndex) => {
    if (currentTurn !== 'player' || gameState !== 'playing' || isAIThinking) {
      return;
    }

    const { drawnCard, remainingHand } = drawCard(opponentHand, cardIndex);
    setOpponentHand(remainingHand);
    
    const { hasPair, newHand, pair } = checkForPair(playerHand, drawnCard);
    setPlayerHand(newHand);
    
    if (hasPair) {
      setPlayerPairs(prev => [...prev, pair]);
      setMessage('You found a pair!');
    } else {
      setMessage('No pair. Opponent\'s turn.');
    }
    
    // Check if game is over
    const { isOver, winner } = checkGameOver(newHand, remainingHand);
    if (isOver) {
      if (winner === 'player') {
        setGameState('won');
        setMessage('You won! Your opponent has the Old Maid.');
      } else if (winner === 'opponent') {
        setGameState('lost');
        setMessage('You lost! You have the Old Maid.');
      }
      return;
    }
    
    // Switch to opponent's turn
    setCurrentTurn('opponent');
    setIsAIThinking(true);
  }, [currentTurn, gameState, isAIThinking, opponentHand, playerHand]);

  // AI draws a card from player
  useEffect(() => {
    if (currentTurn !== 'opponent' || gameState !== 'playing' || !isAIThinking) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const cardIndex = aiChooseCard(playerHand.length);
      const { drawnCard, remainingHand } = drawCard(playerHand, cardIndex);
      setPlayerHand(remainingHand);
      
      const { hasPair, newHand, pair } = checkForPair(opponentHand, drawnCard);
      setOpponentHand(newHand);
      
      if (hasPair) {
        setOpponentPairs(prev => [...prev, pair]);
        setMessage('Opponent found a pair!');
      } else {
        setMessage('Opponent drew a card. Your turn!');
      }
      
      // Check if game is over
      const { isOver, winner } = checkGameOver(remainingHand, newHand);
      if (isOver) {
        if (winner === 'player') {
          setGameState('won');
          setMessage('You won! Your opponent has the Old Maid.');
        } else if (winner === 'opponent') {
          setGameState('lost');
          setMessage('You lost! You have the Old Maid.');
        }
        setIsAIThinking(false);
        return;
      }
      
      // Switch back to player's turn
      setCurrentTurn('player');
      setIsAIThinking(false);
    }, AI_DELAY);

    return () => clearTimeout(timeoutId);
  }, [currentTurn, gameState, isAIThinking, playerHand, opponentHand]);

  const resetGame = useCallback(() => {
    initGame();
  }, [initGame]);

  return {
    playerHand,
    opponentHand,
    playerPairs,
    opponentPairs,
    currentTurn,
    gameState,
    message,
    isAIThinking,
    selectedCardIndex,
    setSelectedCardIndex,
    handlePlayerDraw,
    resetGame
  };
}
