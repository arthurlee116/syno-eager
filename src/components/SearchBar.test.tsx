import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from '@/components/SearchBar';
import { vi } from 'vitest';

describe('SearchBar', () => {
  it('renders correctly', () => {
    render(<SearchBar onSearch={() => {}} />);
    expect(screen.getByPlaceholderText(/Type a word/i)).toBeInTheDocument();
  });

  it('calls onSearch when form is submitted', () => {
    const handleSearch = vi.fn();
    render(<SearchBar onSearch={handleSearch} />);
    
    const input = screen.getByPlaceholderText(/Type a word/i);
    fireEvent.change(input, { target: { value: 'test' } });
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleSearch).toHaveBeenCalledWith('test');
  });

  it('disables button when input is empty', () => {
    render(<SearchBar onSearch={() => {}} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('disables button when isLoading is true', () => {
    render(<SearchBar onSearch={() => {}} isLoading={true} initialValue="test" />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
