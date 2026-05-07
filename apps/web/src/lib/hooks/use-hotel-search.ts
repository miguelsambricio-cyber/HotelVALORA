"use client";

import { useState, useEffect, useCallback } from "react";
import { searchHotels } from "@/lib/api/search";
import type { HotelSearchHit } from "@/types/hotel-search";

interface UseHotelSearch {
  query: string;
  setQuery: (q: string) => void;
  results: HotelSearchHit[];
  isLoading: boolean;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  clear: () => void;
}

export function useHotelSearch(debounceMs = 300): UseHotelSearch {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HotelSearchHit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchHotels(query);
        setResults(data);
        setIsOpen(true);
      } catch {
        setResults([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    setIsLoading(false);
    setIsOpen(false);
  }, []);

  return { query, setQuery, results, isLoading, isOpen, setIsOpen, clear };
}
