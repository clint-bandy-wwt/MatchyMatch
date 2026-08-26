import { render, screen } from '@testing-library/react'
import OregonTrailBoard from '../components/oregontrail/OregonTrailBoard'

describe('OregonTrailBoard', () => {
  it('renders the intro screen', () => {
    render(<OregonTrailBoard />)
    expect(screen.getByText(/Oregon Trail/i)).toBeInTheDocument()
    expect(screen.getByText(/Begin Your Journey/i)).toBeInTheDocument()
  })

  it('displays starting supplies', () => {
    render(<OregonTrailBoard />)
    expect(screen.getByText(/Food: 500/i)).toBeInTheDocument()
    expect(screen.getByText(/Money: \$400/i)).toBeInTheDocument()
    expect(screen.getByText(/Oxen: 3/i)).toBeInTheDocument()
  })
})
