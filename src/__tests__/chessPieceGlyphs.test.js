// A user reported "there isn't even white pieces to move." The actual
// cause turned out to be a CSS layout bug (see chess.css), not font
// support for the hollow "white" chess code points (♔♕♖♗♘♙,
// U+2654-2659) — those render fine in mainstream fonts. Still, depending
// on them is unnecessarily fragile, so the board and the captured-pieces
// panel both render every piece with the solid "black" glyph set and tell
// colors apart with CSS fill/stroke instead. This test guards against
// either of those two components reintroducing the hollow set.
import { render, fireEvent } from '@testing-library/react';
import ChessBoard from '../components/chess/ChessBoard';

// The hollow "white" chess glyphs that must never appear in rendered output.
const HOLLOW_WHITE_GLYPHS = ['♔', '♕', '♖', '♗', '♘', '♙'];

test('no rendered piece uses the hollow "white" glyph set, on the board or in captured pieces', () => {
  const { container } = render(<ChessBoard />);

  // Start of game: white pawns are all on the board.
  const boardGlyphs = Array.from(container.querySelectorAll('.piece')).map((el) => el.textContent);
  expect(boardGlyphs.length).toBeGreaterThan(0);
  for (const glyph of boardGlyphs) {
    expect(HOLLOW_WHITE_GLYPHS).not.toContain(glyph);
  }

  // A white pawn and a black pawn should render the identical glyph —
  // color is applied via CSS class, not a different character.
  const square = (label) => container.querySelector(`button[aria-label="Square ${label}"]`);
  const whitePawnGlyph = square('e2').querySelector('.piece').textContent;
  const blackPawnGlyph = square('e7').querySelector('.piece').textContent;
  expect(whitePawnGlyph).toBe(blackPawnGlyph);

  // Capture a piece (white takes black's d-pawn) and check the captured
  // panel too.
  fireEvent.click(square('e2'));
  fireEvent.click(square('e4'));
  fireEvent.click(square('d7'));
  fireEvent.click(square('d5'));
  fireEvent.click(square('e4'));
  fireEvent.click(square('d5'));

  const capturedGlyphs = Array.from(container.querySelectorAll('.captured-piece')).map(
    (el) => el.textContent
  );
  expect(capturedGlyphs.length).toBeGreaterThan(0);
  for (const glyph of capturedGlyphs) {
    expect(HOLLOW_WHITE_GLYPHS).not.toContain(glyph);
  }
});
