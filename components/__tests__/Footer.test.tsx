
import { render, screen } from '@testing-library/react';
import Footer from '../Footer';

describe('Footer', () => {
  it('renders the footer with the correct text', () => {
    render(<Footer />);
    
    const footerText = screen.getByText(/Desarrollado por Fv-Tech/i);
    expect(footerText).toBeInTheDocument();
  });
});
