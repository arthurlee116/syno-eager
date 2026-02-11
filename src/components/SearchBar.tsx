import React, { useEffect, useState } from 'react';
import { Input } from '@/components/primitives/Input';
import { Button } from '@/components/primitives/Button';
import { Search, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchBarProps {
  onSearch: (word: string) => void;
  isLoading?: boolean;
  variant?: 'centered' | 'top';
  initialValue?: string;
}

export function SearchBar({ onSearch, isLoading, variant = 'centered', initialValue = '' }: SearchBarProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSearch(value);
    }
  };

  return (
    <motion.form 
      layoutId="search-bar-container"
      onSubmit={handleSubmit} 
      className={cn(
        "w-full flex gap-0 relative group max-w-xl"
      )}
    >
      <div className="relative flex-1">
        <Input
          type="text"
          placeholder="Type a word..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={cn(
            "rounded-none border-2 border-r-0 focus-visible:ring-0 focus-visible:border-primary transition-all font-display bg-background",
            variant === 'centered' 
                ? "h-16 text-2xl px-6 placeholder:text-muted-foreground/30" 
                : "h-12 text-lg px-4"
          )}
          autoFocus={variant === 'centered'}
        />
      </div>
      
      <Button 
        type="submit" 
        disabled={isLoading || !value.trim()}
        aria-label="Search"
        className={cn(
          "rounded-none border-2 border-l-0 border-primary bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95",
          variant === 'centered' ? "h-16 w-16" : "h-12 w-12"
        )}
      >
        <AnimatePresence mode="wait">
            {isLoading ? (
            <motion.div
                key="loader"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
            >
                <Loader2 className="w-6 h-6 animate-spin" />
            </motion.div>
            ) : (
            <motion.div
                key="search"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
            >
                {variant === 'centered' ? <ArrowRight className="w-6 h-6" /> : <Search className="w-5 h-5" />}
            </motion.div>
            )}
        </AnimatePresence>
      </Button>
    </motion.form>
  );
}
