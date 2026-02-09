import { useEffect } from 'react';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';

/**
 * Dynamically updates <link rel="icon"> and <link rel="apple-touch-icon">
 * based on branding settings (pwaIconUrl).
 */
export function useDynamicPwaIcon() {
  const { settings } = useBrandingSettings();

  useEffect(() => {
    const iconUrl = settings.pwaIconUrl;
    if (!iconUrl) return;

    // Update favicon
    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) {
      favicon.href = iconUrl;
    }

    // Update apple-touch-icon
    let appleTouchIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (appleTouchIcon) {
      appleTouchIcon.href = iconUrl;
    }
  }, [settings.pwaIconUrl]);
}
