# Euchre Manual Testing Guide

## Bug Fix Verification

The bug was: Game hangs on "West to bid" because `waitingForAI` was not set during deal→bidding1 transition.

### Fix Applied
**File**: `src/components/euchre/EuchreBoard.jsx`  
**Line 278**: Added `waitingForAI: POSITIONS[(state.dealer + 1) % 4] !== 'South',`

## Manual Test Steps

### 1. Start Dev Server
```bash
git pull origin forge/9833c30b-630  # Ensure you have latest
npm install --legacy-peer-deps
npm run dev
```

### 2. Navigate to Euchre
- Open http://localhost:5173/MatchyMatch/
- Search "euchre" or scroll to find it
- Click "Play now"

### 3. Expected Behavior After Fix

**Initial State (< 1 second):**
- Header shows "Dealing..."
- No cards visible yet

**After Deal (immediate):**
- Header shows "[Player] to bid" where Player is West/North/East (whoever is left of dealer)
- If it's West/North/East: **Within 800ms**, that AI player should automatically pass or order up
- If it's South (you): Bidding UI appears with "Order Up" and "Pass" buttons

### 4. Full Hand Walkthrough

**Scenario A: AI bids first (West/North/East)**
1. **0-800ms**: Header says "West to bid"
2. **800ms**: West automatically passes or orders up
   - If pass: Header changes to "North to bid" and cycle continues
   - If order up: Moves to dealer discard or playing phase
3. Continue until trump is called
4. **Playing phase**: Each player plays cards in turn (AI plays automatically after 800ms)
5. **After 5 tricks**: Score updates, "Next Hand" button appears

**Scenario B: You (South) bid first**
1. Bidding UI appears immediately
2. Click "Order Up [suit]" or "Pass"
3. Game proceeds as above

### 5. What to Check

**✅ Game should NOT:**
- Stay stuck on "[Player] to bid" for more than 1 second
- Have all your cards disabled when it's NOT your turn
- Show only "Restart" button with no way forward

**✅ Game SHOULD:**
- Progress through bidding automatically when AI players are up
- Show bidding UI when it's South's (your) turn
- Advance through all 5 tricks of a hand
- Update score after each hand
- Reach 10 points and show game over

### 6. Browser Console Check

Open browser DevTools (F12) → Console tab:
- Should see NO errors
- Should see NO warnings about infinite loops
- Should see state updates happening

### 7. State Inspection (if game still hangs)

In browser console, run:
```javascript
// This will show current game state
document.querySelector('[class*="max-w-5xl"]').textContent
```

Look for:
- What phase is shown in the header?
- What does the message say?
- Are there any buttons visible?

## Expected Test Results

### Unit Tests (Already Passing)
```bash
npm test -- euchre.test.js
```
- ✅ should render without crashing
- ✅ should not get stuck on initial bid - AI should take their turn (THE KEY TEST)
- ✅ should handle dealer discard when trump is ordered up
- ✅ should not crash during state transitions

### Full Test Suite
```bash
npm test
```
- ✅ All 119+ tests pass (including 4 new Euchre tests)

## Troubleshooting

### If game still hangs:

1. **Hard refresh**: Ctrl+Shift+R (Chrome/Edge) or Cmd+Shift+R (Mac)
2. **Clear browser cache**: 
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
3. **Check branch**: 
   ```bash
   git branch --show-current  # Should show: forge/9833c30b-630
   git log --oneline -1       # Should show: 7cef869 Fix critical Euchre state machine bugs
   ```
4. **Check file content**:
   ```bash
   grep -n "waitingForAI: POSITIONS" src/components/euchre/EuchreBoard.jsx
   ```
   Should show line 278 with the fix

### If South's turn doesn't show buttons:

Check the render condition in the code:
- Bidding UI only shows when: `state.currentPlayer === 0` (South is index 0)
- Your hand only clickable when: `state.phase === 'playing'` and `state.currentPlayer === 0`

## Code Flow Summary

```
1. Mount → initGame() → phase: 'deal'
2. useEffect[state.phase] triggers when phase === 'deal'
3. Deal cards, set upCard, setState with:
   - phase: 'bidding1'
   - currentPlayer: (dealer + 1) % 4
   - waitingForAI: POSITIONS[(dealer + 1) % 4] !== 'South'  ← THE FIX
4. If waitingForAI === true:
   - useEffect[state.waitingForAI, ...] triggers
   - setTimeout 800ms
   - AI makes bid decision
   - handleBidDecision('pass' or 'orderUp')
5. State updates, cycle continues
```

## Automated Verification

The Jest tests use fake timers to verify this flow deterministically:
```javascript
// Test advances timers and asserts state changed
await act(async () => { jest.advanceTimersByTime(900) })
expect(document.body.textContent).not.toBe(initialMessage)
```

This test **fails on the original broken code** and **passes on the fixed code**.
