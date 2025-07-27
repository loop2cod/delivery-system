export enum PWAType {
  PUBLIC = 'PUBLIC',
  ADMIN = 'ADMIN', 
  BUSINESS = 'BUSINESS',
  DRIVER = 'DRIVER'
}

export interface PWAConfig {
  name: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  scope: string;
  startUrl: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation?: 'any' | 'portrait' | 'landscape';
  categories: string[];
  lang: string;
  dir: 'ltr' | 'rtl';
}

export const PWA_CONFIGS: Record<PWAType, PWAConfig> = {
  [PWAType.PUBLIC]: {
    name: "UAE Delivery Management - Customer Portal",
    shortName: "DeliveryUAE",
    description: "Professional delivery services across UAE",
    themeColor: "#142C4F",
    backgroundColor: "#ffffff",
    scope: "/",
    startUrl: "/",
    display: "standalone",
    categories: ["business", "logistics"],
    lang: "en",
    dir: "ltr"
  },
  
  [PWAType.ADMIN]: {
    name: "UAE Delivery Management - Admin Panel", 
    shortName: "UAE Admin",
    description: "Administrative control panel for delivery operations",
    themeColor: "#142C4F",
    backgroundColor: "#f8fafc",
    scope: "/admin/",
    startUrl: "/admin/",
    display: "standalone",
    categories: ["business", "productivity"],
    lang: "en",
    dir: "ltr"
  },

  [PWAType.BUSINESS]: {
    name: "UAE Delivery Management - Business Portal",
    shortName: "UAE Business", 
    description: "Business delivery management portal",
    themeColor: "#142C4F",
    backgroundColor: "#ffffff",
    scope: "/business/",
    startUrl: "/business/",
    display: "standalone",
    categories: ["business", "productivity"],
    lang: "en",
    dir: "ltr"
  },

  [PWAType.DRIVER]: {
    name: "UAE Delivery Management - Driver App",
    shortName: "UAE Driver",
    description: "Mobile delivery driver application",
    themeColor: "#C32C3C", 
    backgroundColor: "#fafafa",
    scope: "/driver/",
    startUrl: "/driver/",
    display: "standalone",
    orientation: "portrait",
    categories: ["business", "productivity"],
    lang: "en",
    dir: "ltr"
  }
};

export const BRAND_COLORS = {
  UAE_NAVY: '#142C4F',
  UAE_RED: '#C32C3C', 
  UAE_LIGHT: '#EFEFEF'
} as const;

export const PWA_THEME_VARIANTS = {
  [PWAType.PUBLIC]: {
    primary: BRAND_COLORS.UAE_NAVY,
    accent: BRAND_COLORS.UAE_RED,
    background: '#ffffff',
    heroGradient: `linear-gradient(135deg, ${BRAND_COLORS.UAE_NAVY} 0%, #1e3a8a 100%)`,
    ctaGradient: `linear-gradient(135deg, ${BRAND_COLORS.UAE_RED} 0%, #dc2626 100%)`,
    sectionBg: BRAND_COLORS.UAE_LIGHT
  },
  
  [PWAType.ADMIN]: {
    primary: BRAND_COLORS.UAE_NAVY,
    accent: BRAND_COLORS.UAE_RED,
    background: '#f8fafc',
    sidebarBg: `linear-gradient(135deg, ${BRAND_COLORS.UAE_NAVY} 0%, #1e3a8a 100%)`,
    headerBg: '#ffffff'
  },

  [PWAType.BUSINESS]: {
    primary: BRAND_COLORS.UAE_NAVY,
    accent: '#3b82f6',
    background: '#ffffff',
    sidebarBg: BRAND_COLORS.UAE_LIGHT,
    headerBg: `linear-gradient(135deg, ${BRAND_COLORS.UAE_NAVY} 0%, #1e3a8a 100%)`
  },

  [PWAType.DRIVER]: {
    primary: BRAND_COLORS.UAE_RED,
    accent: '#f59e0b',
    background: '#fafafa',
    headerBg: `linear-gradient(135deg, ${BRAND_COLORS.UAE_RED} 0%, #dc2626 100%)`,
    buttonBg: `linear-gradient(135deg, ${BRAND_COLORS.UAE_RED} 0%, #dc2626 100%)`
  }
};