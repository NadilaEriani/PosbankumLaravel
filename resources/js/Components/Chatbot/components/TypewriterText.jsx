import { useState, useEffect } from 'react';

export default function TypewriterText({ text, speedMs = 150 }) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    // Sanitize input: handle null/undefined, remove undefined tokens, trim
    const cleanText = (text || '').replace(/undefined/gi, '').trim();
    if (!cleanText) {
      setDisplayedText('');
      return;
    }

    // Tampilkan utuh untuk loading
    if (cleanText === 'Menyusun jawaban...') {
      setDisplayedText(cleanText);
      return;
    }

    // Split dan filter kata kosong
    const words = cleanText.split(' ').filter(word => word.trim().length > 0);
    if (words.length === 0) {
      setDisplayedText(cleanText);
      return;
    }

    let currentIndex = 0;
    setDisplayedText('');

    const intervalId = setInterval(() => {
      if (currentIndex < words.length) {
        const word = words[currentIndex].trim();
        if (word) {
          setDisplayedText((prev) => 
            prev ? prev + ' ' + word : word
          );
        }
        currentIndex++;
      } else {
        clearInterval(intervalId);
      }
    }, speedMs);

    return () => clearInterval(intervalId);
  }, [text, speedMs]);

  return <>{displayedText}</>;
}
