import { useState, useEffect } from 'react';
import { HighscoreManager, type Highscore } from '../config/firebase';

interface UseHighscoresReturn {
  highscores: Highscore[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for managing highscores from Firebase
 * Sets up real-time listener on mount and cleans up on unmount
 */
export function useHighscores(): UseHighscoresReturn {
  const [highscores, setHighscores] = useState<Highscore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const scores = await HighscoreManager.fetchHighscores(25);
      setHighscores(scores);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ukjent feil';
      setError(errorMessage);
      console.error('Highscores fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set up real-time listener
    const unsubscribe = HighscoreManager.subscribeToHighscores((scores) => {
      // Limit to top 25 scores
      const top25 = scores.slice(0, 25);
      setHighscores(top25);
      setLoading(false);
      setError(null);
    });

    // Cleanup listener on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  return { highscores, loading, error, refetch };
}
