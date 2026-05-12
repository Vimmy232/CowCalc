/**
 * useLocalStorage Hook
 * Handles plan auto-save and recovery from localStorage
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import {
  savePlanToLocalStorage,
  loadPlanFromLocalStorage,
  clearPlanFromLocalStorage,
} from '../services/planSerializer.js';

/**
 * Custom hook for localStorage persistence
 * Auto-saves plan with debouncing to avoid excessive writes
 * @param {object} plan - Current plan
 * @param {boolean} enabled - Whether to enable auto-save (default true)
 * @param {number} debounceMs - Debounce interval in milliseconds (default 1000)
 * @returns {object} { save, load, clear, hasSavedPlan }
 */
export function useLocalStorage(plan, enabled = true, debounceMs = 1000) {
  const saveTimeoutRef = useRef(null);

  // Auto-save with debounce
  useEffect(() => {
    if (!enabled || !plan) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      const success = savePlanToLocalStorage(plan);
      if (success) {
        console.log('[CowCalc] Plan auto-saved to localStorage');
      }
    }, debounceMs);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [plan, enabled, debounceMs]);

  const save = useCallback(() => {
    return savePlanToLocalStorage(plan);
  }, [plan]);

  const load = useCallback(() => {
    return loadPlanFromLocalStorage();
  }, []);

  const clear = useCallback(() => {
    return clearPlanFromLocalStorage();
  }, []);

  const hasSavedPlan = useCallback(() => {
    try {
      const saved = localStorage.getItem('cowcalc_v2');
      return saved !== null;
    } catch {
      return false;
    }
  }, []);

  return { save, load, clear, hasSavedPlan };
}

/**
 * Custom hook to load saved plan on app start
 * @returns {object} { savedPlan, isLoading, error }
 */
export function useLoadSavedPlan() {
  const [savedPlan, setSavedPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      setIsLoading(true);
      const plan = loadPlanFromLocalStorage();
      setSavedPlan(plan);
    } catch (err) {
      console.error('[CowCalc] Error loading saved plan:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { savedPlan, isLoading, error };
}
