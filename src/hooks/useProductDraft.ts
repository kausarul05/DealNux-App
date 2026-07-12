// hooks/useProductDraft.ts
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const DRAFT_KEY = 'product_draft';

export interface ProductDraft {
  title: string;
  description: string;
  brand: string;
  modelNumber: string;
  category: string;
  price: string;
  originalPrice: string;
  currency: string;
  quantity: string;
  condition: string;
  freeShipping: boolean;
  shippingCost: string;
  estimatedDeliveryDays: string;
  returnsAccepted: boolean;
  returnPeriodDays: string;
  mainImage: any;
  images: any[];
  currentStep: number;
  lastSaved: string;
}

const defaultDraft: ProductDraft = {
  title: '',
  description: '',
  brand: '',
  modelNumber: '',
  category: '',
  price: '',
  originalPrice: '',
  currency: 'USD',
  quantity: '',
  condition: 'NEW',
  freeShipping: false,
  shippingCost: '',
  estimatedDeliveryDays: '',
  returnsAccepted: false,
  returnPeriodDays: '',
  mainImage: null,
  images: [],
  currentStep: 1,
  lastSaved: new Date().toISOString(),
};

export const useProductDraft = () => {
  const [draft, setDraft] = useState<ProductDraft>(defaultDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // ─── Load Draft ──────────────────────────────────────────────────────────
  const loadDraft = useCallback(async () => {
    try {
      setLoading(true);
      const saved = await AsyncStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setDraft(parsed);
        setLastSaved(parsed.lastSaved || null);
        console.log('📂 Draft loaded:', parsed);
      }
    } catch (error) {
      console.error('❌ Error loading draft:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Save Draft ──────────────────────────────────────────────────────────
  const saveDraft = useCallback(async (data: Partial<ProductDraft>) => {
    try {
      setSaving(true);
      const updated = {
        ...draft,
        ...data,
        lastSaved: new Date().toISOString(),
      };
      setDraft(updated);
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(updated));
      setLastSaved(updated.lastSaved);
      console.log('💾 Draft saved:', updated);
    } catch (error) {
      console.error('❌ Error saving draft:', error);
    } finally {
      setSaving(false);
    }
  }, [draft]);

  // ─── Update Single Field ──────────────────────────────────────────────
  const updateField = useCallback((field: keyof ProductDraft, value: any) => {
    saveDraft({ [field]: value });
  }, [saveDraft]);

  // ─── Update Step ────────────────────────────────────────────────────────
  const updateStep = useCallback((step: number) => {
    saveDraft({ currentStep: step });
  }, [saveDraft]);

  // ─── Clear Draft ─────────────────────────────────────────────────────────
  const clearDraft = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_KEY);
      setDraft(defaultDraft);
      setLastSaved(null);
      console.log('🗑️ Draft cleared');
    } catch (error) {
      console.error('❌ Error clearing draft:', error);
    }
  }, []);

  // ─── Auto-Save on Unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (draft.title || draft.description || draft.price) {
        saveDraft({});
      }
    };
  }, [draft, saveDraft]);

  // ─── Load on Mount ──────────────────────────────────────────────────────
  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  return {
    draft,
    loading,
    saving,
    lastSaved,
    updateField,
    updateStep,
    saveDraft,
    clearDraft,
    loadDraft,
  };
};