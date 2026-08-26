// Regression tests for two bugs found by code review:
// 1. useChessGame stored move history entries as `{ ...fromSquare, ...toSquare }`,
//    which silently drops the origin square (both objects share `row`/`col` keys,
//    so the spread of `toSquare` overwrote `fromSquare`'s). undoMove then replayed
//    history as "move from X to X", which crashes once the reconstructed board has
//    an empty square at that position.
// 2. CapturedPieces.jsx read `capturedPieces.black` under the "White captured"
//    label and vice versa — capturedPieces[turn] holds pieces captured *by* that
//    color (see useChessGame.js), so the panel had white's and black's captures
//    swapped.
import { render, fireEvent, cleanup } from '@testing-library/react';
import ChessBoard from '../components/chess/ChessBoard';

afterEach(cleanup);

function square(container, label) {
  return container.querySelector(`button[aria-label="Square ${label}"]`);
}

function playMove(container, from, to) {
  fireEvent.click(square(container, from));
  fireEvent.click(square(container, to));
}

// These tests drive both sides by hand, so they need 2-player mode —
// the default vs-AI mode won't let clicks move the AI's (black) pieces.
function enableTwoPlayerMode(container) {
  const toggle = Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent.includes('2 Player')
  );
  fireEvent.click(toggle);
}

test('undo after two moves does not throw and reverts the last move', () => {
  const { container } = render(<ChessBoard />);
  enableTwoPlayerMode(container);

  playMove(container, 'e2', 'e4');
  playMove(container, 'd7', 'd5');

  const undoBtn = Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent.includes('Undo')
  );

  expect(() => fireEvent.click(undoBtn)).not.toThrow();

  // Black's d7-d5 should be undone: pawn back on d7, black to move.
  expect(container.textContent).toContain('Black to move');
  expect(container.textContent).toContain('e4');
  expect(container.textContent).not.toContain('d5');
});

test('undo can be clicked repeatedly back to the start without throwing', () => {
  const { container } = render(<ChessBoard />);
  enableTwoPlayerMode(container);

  playMove(container, 'e2', 'e4');
  playMove(container, 'd7', 'd5');
  playMove(container, 'g1', 'f3');

  const undoBtn = () =>
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes('Undo'));

  expect(() => {
    fireEvent.click(undoBtn());
    fireEvent.click(undoBtn());
    fireEvent.click(undoBtn());
  }).not.toThrow();

  expect(container.textContent).toContain('No moves yet');
});

test('captured pieces are attributed to the capturing side, not swapped', () => {
  const { container } = render(<ChessBoard />);
  enableTwoPlayerMode(container);

  playMove(container, 'e2', 'e4');
  playMove(container, 'd7', 'd5');
  playMove(container, 'e4', 'd5'); // white captures black's d-pawn

  const whiteSection = Array.from(container.querySelectorAll('.captured-section')).find((s) =>
    s.textContent.includes('White captured')
  );
  const blackSection = Array.from(container.querySelectorAll('.captured-section')).find((s) =>
    s.textContent.includes('Black captured')
  );

  expect(whiteSection.querySelectorAll('.captured-piece')).toHaveLength(1);
  expect(blackSection.querySelectorAll('.captured-piece')).toHaveLength(0);
  expect(whiteSection.textContent).toContain('+1');
});
