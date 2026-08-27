// src/hooks/useOldMaid.js
import { useState, useCallback, useEffect, useRef } from 'react';
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

// Initialize game state
function initializeGame() {
  const deck = shuffle(createDeck());
  const { playerHand: initialPlayerHand, opponentHand: initialOpponentHand } = dealCards(deck);
  
  // Remove initial pairs from both hands
  const { newHand: playerHandAfterPairs, pairs: initialPlayerPairs } = removePairs(initialPlayerHand);
  const { newHand: opponentHandAfterPairs, pairs: initialOpponentPairs } = removePairs(initialOpponentHand);
  
  // Check if game is already over after dealing (defect 1 fix)
  const { isOver, winner } = checkGameOver(playerHandAfterPairs, opponentHandAfterPairs);
  
  let gameState = 'playing';
  let message = 'Your turn! Draw a card from your opponent.';
  let unmatchedQueen = null;
  
  if (isOver) {
    if (winner === 'player') {
      gameState = 'won';
      message = 'You won! Your opponent has the Old Maid.';
      unmatchedQueen = opponentHandAfterPairs[0] || null;
    } else if (winner === 'opponent') {
      gameState = 'lost';
      message = 'You lost! You have the Old Maid.';
      unmatchedQueen = playerHandAfterPairs[0] || null;
    }
  }
  
  return {
    playerHand: playerHandAfterPairs,
    opponentHand: opponentHandAfterPairs,
    playerPairs: initialPlayerPairs,
    opponentPairs: initialOpponentPairs,
    currentTurn: 'player',
    gameState,
    message,
    isAIThinking: false,
    unmatchedQueen
  };
}

export function useOldMaid() {
  // Defect 2 fix: Use lazy initialization instead of useEffect
  // Initialize all state from a single game initialization
  const [state, setState] = useState(() => initializeGame());
  
  // Defect 3 fix: Add re-entrancy guard using a ref
  const isProcessingRef = useRef(false);

  // Handle player drawing a card from opponent
  const handlePlayerDraw = useCallback((cardIndex) => {
    // Defect 3 fix: Check re-entrancy guard first
    if (isProcessingRef.current) {
      return;
    }
    
    // Use functional setState to get current values (defect 3 fix)
    setState(prevState => {
      if (prevState.currentTurn !== 'player' || prevState.gameState !== 'playing' || prevState.isAIThinking) {
        return prevState;
      }
      
      // Set re-entrancy guard
      isProcessingRef.current = true;
      
      // Perform the draw
      const { drawnCard, remainingHand: newOpponentHand } = drawCard(prevState.opponentHand, cardIndex);
      const { hasPair, newHand: newPlayerHand, pair } = checkForPair(prevState.playerHand, drawnCard);
      
      let newMessage;
      let newPlayerPairs = prevState.playerPairs;
      
      if (hasPair) {
        newPlayerPairs = [...prevState.playerPairs, pair];
        newMessage = 'You found a pair!';
      } else {
        newMessage = 'No pair. Opponent\'s turn.';
      }
      
      // Check if game is over
      const { isOver, winner } = checkGameOver(newPlayerHand, newOpponentHand);
      if (isOver) {
        let newGameState;
        let unmatchedQueen = null;
        
        if (winner === 'player') {
          newGameState = 'won';
          newMessage = 'You won! Your opponent has the Old Maid.';
          unmatchedQueen = newOpponentHand[0] || null;
        } else if (winner === 'opponent') {
          newGameState = 'lost';
          newMessage = 'You lost! You have the Old Maid.';
          unmatchedQueen = newPlayerHand[0] || null;
        }
        
        isProcessingRef.current = false;
        
        return {
          ...prevState,
          playerHand: newPlayerHand,
          opponentHand: newOpponentHand,
          playerPairs: newPlayerPairs,
          gameState: newGameState,
          message: newMessage,
          unmatchedQueen
        };
      }
      
      // Switch to opponent's turn
      isProcessingRef.current = false;
      
      return {
        ...prevState,
        playerHand: newPlayerHand,
        opponentHand: newOpponentHand,
        playerPairs: newPlayerPairs,
        currentTurn: 'opponent',
        message: newMessage,
        isAIThinking: true
      };
    });
  }, []);

  // AI draws a card from player
  useEffect(() => {
    if (state.currentTurn !== 'opponent' || state.gameState !== 'playing' || !state.isAIThinking) {
      return;
    }

    const timeoutId = setTimeout(() => {
      // Defect 3 fix: Use functional setState for all updates
      setState(prevState => {
        const cardIndex = aiChooseCard(prevState.playerHand.length);
        const { drawnCard, remainingHand: newPlayerHand } = drawCard(prevState.playerHand, cardIndex);
        const { hasPair, newHand: newOpponentHand, pair } = checkForPair(prevState.opponentHand, drawnCard);
        
        let newMessage;
        let newOpponentPairs = prevState.opponentPairs;
        
        if (hasPair) {
          newOpponentPairs = [...prevState.opponentPairs, pair];
          newMessage = 'Opponent found a pair!';
        } else {
          newMessage = 'Opponent drew a card. Your turn!';
        }
        
        // Check if game is over
        const { isOver, winner } = checkGameOver(newPlayerHand, newOpponentHand);
        if (isOver) {
          let newGameState;
          let unmatchedQueen = null;
          
          if (winner === 'player') {
            newGameState = 'won';
            newMessage = 'You won! Your opponent has the Old Maid.';
            unmatchedQueen = newOpponentHand[0] || null;
          } else if (winner === 'opponent') {
            newGameState = 'lost';
            newMessage = 'You lost! You have the Old Maid.';
            unmatchedQueen = newPlayerHand[0] || null;
          }
          
          return {
            ...prevState,
            playerHand: newPlayerHand,
            opponentHand: newOpponentHand,
            opponentPairs: newOpponentPairs,
            gameState: newGameState,
            message: newMessage,
            isAIThinking: false,
            unmatchedQueen
          };
        }
        
        // Switch back to player's turn
        return {
          ...prevState,
          playerHand: newPlayerHand,
          opponentHand: newOpponentHand,
          opponentPairs: newOpponentPairs,
          currentTurn: 'player',
          message: newMessage,
          isAIThinking: false
        };
      });
    }, AI_DELAY);

    return () => clearTimeout(timeoutId);
  }, [state.currentTurn, state.gameState, state.isAIThinking]);

  const resetGame = useCallback(() => {
    setState(initializeGame());
    isProcessingRef.current = false;
  }, []);

  return {
    playerHand: state.playerHand,
    opponentHand: state.opponentHand,
    playerPairs: state.playerPairs,
    opponentPairs: state.opponentPairs,
    currentTurn: state.currentTurn,
    gameState: state.gameState,
    message: state.message,
    isAIThinking: state.isAIThinking,
    unmatchedQueen: state.unmatchedQueen,
    handlePlayerDraw,
    resetGame
  };
}
