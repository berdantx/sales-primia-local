import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BrandingSettings {
  appName: string;
  appSubtitle: string;
  logoUrl: string | null;
  logoUrlDark: string | null;
  primaryColor: string; // HSL format e.g., "217 100% 50%"
  primaryColorDark: string;
  signupEnabled: boolean;
}

const DEFAULT_SETTINGS: BrandingSettings = {
  appName: 'Primia - Analytics',
  appSubtitle: 'Gestão de Leads e Vendas',
  logoUrl: null,
  logoUrlDark: null,
  primaryColor: '160 100% 35%',
  primaryColorDark: '160 100% 40%',
  signupEnabled: false,
};

const SETTINGS_KEYS = [
  'app_name',
  'app_subtitle',
  'logo_url',
  'logo_url_dark',
  'primary_color',
  'primary_color_dark',
  'signup_enabled',
] as const;

const CACHE_KEY = 'branding-settings-cache';
const CACHE_TIMESTAMP_KEY = 'branding-settings-cache-timestamp';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour in milliseconds

type SettingKey = typeof SETTINGS_KEYS[number];

function mapKeyToProperty(key: SettingKey): keyof BrandingSettings {
  const map: Record<SettingKey, keyof BrandingSettings> = {
    app_name: 'appName',
    app_subtitle: 'appSubtitle',
    logo_url: 'logoUrl',
    logo_url_dark: 'logoUrlDark',
    primary_color: 'primaryColor',
    primary_color_dark: 'primaryColorDark',
    signup_enabled: 'signupEnabled',
  };
  return map[key];
}

function mapPropertyToKey(property: keyof BrandingSettings): SettingKey {
  const map: Record<keyof BrandingSettings, SettingKey> = {
    appName: 'app_name',
    appSubtitle: 'app_subtitle',
    logoUrl: 'logo_url',
    logoUrlDark: 'logo_url_dark',
    primaryColor: 'primary_color',
    primaryColorDark: 'primary_color_dark',
    signupEnabled: 'signup_enabled',
  };
  return map[property];
}

// Get cached settings from localStorage
function getCachedSettings(): BrandingSettings | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (!cached || !timestamp) return null;
    
    // Check if cache is still valid
    const cacheAge = Date.now() - parseInt(timestamp, 10);
    if (cacheAge > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return null;
    }
    
    return JSON.parse(cached) as BrandingSettings;
  } catch {
    return null;
  }
}

// Save settings to localStorage cache
function setCachedSettings(settings: BrandingSettings): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch {
    // Ignore localStorage errors
  }
}

// Clear cached settings
export function clearBrandingCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

// Apply theme colors immediately on page load from cache
function applyInitialTheme(): void {
  const cached = getCachedSettings();
  if (cached?.primaryColor && cached.primaryColor !== DEFAULT_SETTINGS.primaryColor) {
    applyThemeColors(cached.primaryColor, cached.primaryColorDark);
  }
}

// Apply initial theme immediately
if (typeof window !== 'undefined') {
  applyInitialTheme();
}

export function useBrandingSettings() {
  const queryClient = useQueryClient();
  
  // Get initial data from cache for instant display
  const cachedSettings = getCachedSettings();

  const { data: settings = cachedSettings || DEFAULT_SETTINGS, isLoading } = useQuery({
    queryKey: ['branding-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', SETTINGS_KEYS);

      if (error) throw error;

      const result = { ...DEFAULT_SETTINGS };

      data?.forEach((row) => {
        const property = mapKeyToProperty(row.key as SettingKey);
        if (property === 'logoUrl' || property === 'logoUrlDark') {
          result[property] = row.value || null;
        } else if (property === 'signupEnabled') {
          result[property] = row.value === 'true';
        } else {
          (result as any)[property] = row.value;
        }
      });

      // Update cache with fresh data
      setCachedSettings(result);

      return result;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes in React Query
    initialData: cachedSettings || undefined,
  });

  // Apply theme colors when settings change
  useEffect(() => {
    if (settings.primaryColor && settings.primaryColor !== DEFAULT_SETTINGS.primaryColor) {
      applyThemeColors(settings.primaryColor, settings.primaryColorDark);
    }
  }, [settings.primaryColor, settings.primaryColorDark]);

  const updateMutation = useMutation({
    mutationFn: async (newSettings: Partial<BrandingSettings>) => {
      const updates = Object.entries(newSettings).map(([property, value]) => {
        const key = mapPropertyToKey(property as keyof BrandingSettings);
        // Convert boolean to string for storage
        const stringValue = typeof value === 'boolean' ? String(value) : (value ?? '');
        return { key, value: stringValue };
      });

      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(
            { key: update.key, value: update.value, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          );

        if (error) throw error;
      }

      return newSettings;
    },
    onSuccess: (newSettings) => {
      // Update cache immediately with new settings
      const currentSettings = settings;
      const updatedSettings = { ...currentSettings, ...newSettings };
      setCachedSettings(updatedSettings);
      
      queryClient.invalidateQueries({ queryKey: ['branding-settings'] });
      toast.success('Configurações de branding salvas!');
    },
    onError: (error) => {
      console.error('Error saving branding settings:', error);
      toast.error('Erro ao salvar configurações');
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}

export function applyThemeColors(primaryColor: string, primaryColorDark: string) {
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');

  const color = isDark ? primaryColorDark : primaryColor;

  root.style.setProperty('--primary', color);
  root.style.setProperty('--ring', color);
  root.style.setProperty('--sidebar-primary', color);
  root.style.setProperty('--sidebar-ring', color);
  root.style.setProperty('--chart-1', color);
}

export function resetThemeColors() {
  const root = document.documentElement;
  root.style.removeProperty('--primary');
  root.style.removeProperty('--ring');
  root.style.removeProperty('--sidebar-primary');
  root.style.removeProperty('--sidebar-ring');
  root.style.removeProperty('--chart-1');
}

// Color presets
export const COLOR_PRESETS = [
  { name: 'Azul', hsl: '217 100% 50%', hslDark: '217 100% 55%', hex: '#0066FF' },
  { name: 'Verde', hsl: '160 100% 35%', hslDark: '160 100% 40%', hex: '#00B37E' },
  { name: 'Roxo', hsl: '280 65% 50%', hslDark: '280 65% 55%', hex: '#9333EA' },
  { name: 'Vermelho', hsl: '0 84% 55%', hslDark: '0 84% 60%', hex: '#EF4444' },
  { name: 'Laranja', hsl: '25 95% 53%', hslDark: '25 95% 58%', hex: '#F97316' },
  { name: 'Rosa', hsl: '330 80% 50%', hslDark: '330 80% 55%', hex: '#EC4899' },
];
