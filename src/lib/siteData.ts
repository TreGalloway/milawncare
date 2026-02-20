import type { ServiceArea } from '../types/index';
import { fetchSiteSettings, fetchServiceAreas } from '../lib/strapi';

export interface SiteData {
  companyName: string;
  phoneNumber: string;
  yardbookUrl: string;
  email?: string;
  address?: string;
}

export const DEFAULT_SITE_DATA: SiteData = {
  companyName: 'MI Premier Lawn Care, L.L.C',
  phoneNumber: '(810) 309-9528',
  yardbookUrl: 'http://ydbk.co/137258',
};

export async function getSiteData(): Promise<SiteData> {
  try {
    const settings = await fetchSiteSettings();
    if (settings) {
      return {
        companyName: settings.companyName || DEFAULT_SITE_DATA.companyName,
        phoneNumber: settings.phoneNumber || DEFAULT_SITE_DATA.phoneNumber,
        yardbookUrl: settings.yardbookUrl || DEFAULT_SITE_DATA.yardbookUrl,
        email: settings.email,
        address: settings.address,
      };
    }
  } catch (e) {
    console.warn('Failed to fetch site settings:', e);
  }
  return DEFAULT_SITE_DATA;
}

export async function getServiceAreas(): Promise<ServiceArea[]> {
  try {
    const areas = await fetchServiceAreas();
    return areas;
  } catch (e) {
    console.warn('Failed to fetch service areas:', e);
    return [];
  }
}
