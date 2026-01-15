import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BrandingSettings {
  appName: string;
  appSubtitle: string;
  logoUrl: string | null;
  primaryColor: string; // HSL format e.g., "217 100% 50%"
  primaryColorDark: string;
}

const DEFAULT_SETTINGS: BrandingSettings = {
  appName: 'Sales Analytics',
  appSubtitle: 'Análise de Vendas',
  logoUrl: null,
  primaryColor: '217 100% 50%',
  primaryColorDark: '217 100% 55%',
};

const SETTINGS_KEYS = [
  'app_name',
  'app_subtitle',
  'logo_url',
  'primary_color',
  'primary_color_dark',
] as const;

type SettingKey = typeof SETTINGS_KEYS[number];

function mapKeyToProperty(key: SettingKey): keyof BrandingSettings {
  const map: Record<SettingKey, keyof BrandingSettings> = {
    app_name: 'appName',
    app_subtitle: 'appSubtitle',
    logo_url: 'logoUrl',
    primary_color: 'primaryColor',
    primary_color_dark: 'primaryColorDark',
  };
  return map[key];
}

function mapPropertyToKey(property: keyof BrandingSettings): SettingKey {
  const map: Record<keyof BrandingSettings, SettingKey> = {
    appName: 'app_name',
    appSubtitle: 'app_subtitle',
    logoUrl: 'logo_url',
    primaryColor: 'primary_color',
    primaryColorDark: 'primary_color_dark',
  };
  return map[property];
}

export function useBrandingSettings() {
  const queryClient = useQueryClient();

  const { data: settings = DEFAULT_SETTINGS, isLoading } = useQuery({
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
        if (property === 'logoUrl') {
          result[property] = row.value || null;
        } else {
          (result as any)[property] = row.value;
        }
      });

      return result;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
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
        return { key, value: value ?? '' };
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
    onSuccess: () => {
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
