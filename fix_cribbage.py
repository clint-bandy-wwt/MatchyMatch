#!/usr/bin/env python3
"""Fix lint errors in useCribbageGame.js"""

with open('src/hooks/useCribbageGame.js', 'r') as f:
    content = f.read()

# Fix 1: Remove unused variable aiHandForCounting (line 643)
content = content.replace(
    "      const aiHandForCounting = [...aiHand, ...playedCards.filter(c => c.player === 'ai').map(c => ({ id: c.id, suit: c.suit, rank: c.rank, value: c.value }))]",
    "      // Hand counting would happen here in full implementation"
)

# Fix 2: Move countHands before endPegging to avoid forward reference
# Find the countHands function
count_hands_start = content.find("  /**\n   * Count hands and crib\n   */\n  const countHands =")
count_hands_end = content.find("  }, [cutCard, dealer, playerScore, aiScore, aiHand, playedCards, dealCards])\n\n  /**\n   * Start new game", count_hands_start) + len("  }, [cutCard, dealer, playerScore, aiScore, aiHand, playedCards, dealCards])")

# Find endPegging function
end_pegging_start = content.find("  /**\n   * End pegging phase and move to counting\n   */\n  const endPegging =")
end_pegging_end = content.find("  }, [])\n\n  /**\n   * Count hands", end_pegging_start) + len("  }, [])")

if count_hands_start > end_pegging_start:
    # Extract both functions
    count_hands_func = content[count_hands_start:count_hands_end]
    end_pegging_func = content[end_pegging_start:end_pegging_end]
    
    # Remove them from original positions
    before_end_pegging = content[:end_pegging_start]
    between = content[end_pegging_end:count_hands_start]
    after_count_hands = content[count_hands_end:]
    
    # Reconstruct with countHands before endPegging
    content = before_end_pegging + count_hands_func + "\n\n" + end_pegging_func + between + after_count_hands

# Fix 3: Add countHands to endPegging dependencies
content = content.replace(
    "    setTimeout(() => countHands(), 1000)\n  }, [])",
    "    setTimeout(() => countHands(), 1000)\n  }, [countHands])"
)

# Fix 4: Add missing dependencies to playCard
content = content.replace(
    "  }, [phase, currentPlayer, peggingCount, playerHand, aiHand, playedCards])",
    "  }, [phase, currentPlayer, peggingCount, playerHand, aiHand, playedCards, calculatePeggingScore, getPeggingReason, endPegging])"
)

# Fix 5: Add missing dependencies to AI pegging useEffect
content = content.replace(
    "  }, [phase, currentPlayer, isAIThinking, aiHand, playerHand, peggingCount, playedCards, playerDeclaredGo])",
    "  }, [phase, currentPlayer, isAIThinking, aiHand, playerHand, peggingCount, playedCards, playerDeclaredGo, calculatePeggingScore, getPeggingReason, endPegging])"
)

with open('src/hooks/useCribbageGame.js', 'w') as f:
    f.write(content)

print("Fixed useCribbageGame.js")
