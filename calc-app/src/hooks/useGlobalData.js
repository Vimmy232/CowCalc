/**
 * useGlobalData Hook
 * Loads and caches global game data (buildings, research, maps)
 */

import { useEffect, useState, useCallback } from 'react';
import { getCachedGlobalData, getCachedFactionData } from '../services/dataLoader.js';

/**
 * Custom hook to load and manage global game data
 * @returns {object} { globalData, isLoading, error, refetch }
 */
export function useGlobalData() {
  const [globalData, setGlobalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getCachedGlobalData();
      setGlobalData(data);
    } catch (err) {
      console.error('[CowCalc] Error loading global data:', err);
      setError(err.message || 'Failed to load game data');
      setGlobalData({
        buildingData: [],
        researchData: [],
        mapList: [],
        error: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    globalData,
    isLoading,
    error,
    refetch: loadData,
  };
}

/**
 * Custom hook to load faction-specific unit data
 * @param {string} faction - Faction name
 * @returns {object} { unitData, isLoading, error }
 */
export function useFactionUnitData(faction) {
  const [unitData, setUnitData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!faction) {
      setUnitData([]);
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getCachedFactionData(faction);
        setUnitData(data);
      } catch (err) {
        console.error(`[CowCalc] Error loading faction data for ${faction}:`, err);
        setError(err.message);
        setUnitData([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [faction]);

  return { unitData, isLoading, error };
}
