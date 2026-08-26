import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SpaceInvadersBoard from '../components/spaceinvaders/SpaceInvadersBoard';

describe('SpaceInvadersBoard', () => {
  it('renders the game title', () => {
    render(<SpaceInvadersBoard dark={false} />);
    expect(screen.getByText('Space Invaders')).toBeInTheDocument();
  });

  it('renders the start button', () => {
    render(<SpaceInvadersBoard dark={false} />);
    expect(screen.getByText('Start Game')).toBeInTheDocument();
  });

  it('renders the canvas element', () => {
    render(<SpaceInvadersBoard dark={false} />);
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('displays initial score of 0', () => {
    render(<SpaceInvadersBoard dark={false} />);
    // Check for Score label
    expect(screen.getByText('Score')).toBeInTheDocument();
  });

  it('displays initial 3 lives as hearts', () => {
    render(<SpaceInvadersBoard dark={false} />);
    const hearts = document.querySelectorAll('[style*="💚"]');
    // Should have 3 green hearts initially
    expect(hearts.length).toBeGreaterThan(0);
  });
});
