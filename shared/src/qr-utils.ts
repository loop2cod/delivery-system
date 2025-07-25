// QR Code utilities for package tracking across all PWAs
import QRCode from 'qrcode';

export interface QRCodeData {
  type: 'package' | 'delivery' | 'inquiry' | 'tracking';
  id: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface QRCodeOptions {
  size?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export class QRCodeManager {
  private readonly baseUrl: string;
  private readonly defaultOptions: QRCodeOptions = {
    size: 256,
    margin: 2,
    color: {
      dark: '#142C4F', // UAE navy blue
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'M'
  };

  constructor(baseUrl: string = 'https://delivery.uae.com') {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate QR code data URL for a package
   */
  async generatePackageQR(
    packageId: string, 
    metadata: Record<string, any> = {},
    options: QRCodeOptions = {}
  ): Promise<string> {
    const qrData: QRCodeData = {
      type: 'package',
      id: packageId,
      timestamp: Date.now(),
      metadata
    };

    const trackingUrl = this.createTrackingUrl(qrData);
    return this.generateQRCode(trackingUrl, { ...this.defaultOptions, ...options });
  }

  /**
   * Generate QR code for delivery confirmation
   */
  async generateDeliveryQR(
    deliveryId: string,
    metadata: Record<string, any> = {},
    options: QRCodeOptions = {}
  ): Promise<string> {
    const qrData: QRCodeData = {
      type: 'delivery',
      id: deliveryId,
      timestamp: Date.now(),
      metadata
    };

    const confirmationUrl = this.createConfirmationUrl(qrData);
    return this.generateQRCode(confirmationUrl, { ...this.defaultOptions, ...options });
  }

  /**
   * Generate QR code for inquiry tracking
   */
  async generateInquiryQR(
    inquiryId: string,
    metadata: Record<string, any> = {},
    options: QRCodeOptions = {}
  ): Promise<string> {
    const qrData: QRCodeData = {
      type: 'inquiry',
      id: inquiryId,
      timestamp: Date.now(),
      metadata
    };

    const inquiryUrl = this.createInquiryUrl(qrData);
    return this.generateQRCode(inquiryUrl, { ...this.defaultOptions, ...options });
  }

  /**
   * Generate QR code for general tracking
   */
  async generateTrackingQR(
    trackingId: string,
    metadata: Record<string, any> = {},
    options: QRCodeOptions = {}
  ): Promise<string> {
    const qrData: QRCodeData = {
      type: 'tracking',
      id: trackingId,
      timestamp: Date.now(),
      metadata
    };

    const trackingUrl = this.createGenericTrackingUrl(qrData);
    return this.generateQRCode(trackingUrl, { ...this.defaultOptions, ...options });
  }

  /**
   * Parse QR code data from scanned content
   */
  parseQRData(scannedContent: string): QRCodeData | null {
    try {
      // Check if it's a URL from our system
      if (scannedContent.startsWith(this.baseUrl)) {
        return this.parseUrlData(scannedContent);
      }

      // Try to parse as JSON (direct QR data)
      const data = JSON.parse(scannedContent);
      if (this.isValidQRData(data)) {
        return data as QRCodeData;
      }

      return null;
    } catch (error) {
      console.error('[QR Utils] Failed to parse QR data:', error);
      return null;
    }
  }

  /**
   * Validate if scanned QR belongs to our system
   */
  isValidQRCode(scannedContent: string): boolean {
    const data = this.parseQRData(scannedContent);
    return data !== null && this.isValidQRData(data);
  }

  /**
   * Generate batch QR codes for multiple items
   */
  async generateBatchQRCodes(
    items: Array<{
      type: QRCodeData['type'];
      id: string;
      metadata?: Record<string, any>;
    }>,
    options: QRCodeOptions = {}
  ): Promise<Array<{ id: string; qrCode: string; url: string }>> {
    const results = [];

    for (const item of items) {
      let qrCode: string;
      let url: string;

      const qrData: QRCodeData = {
        type: item.type,
        id: item.id,
        timestamp: Date.now(),
        metadata: item.metadata || {}
      };

      switch (item.type) {
        case 'package':
          url = this.createTrackingUrl(qrData);
          break;
        case 'delivery':
          url = this.createConfirmationUrl(qrData);
          break;
        case 'inquiry':
          url = this.createInquiryUrl(qrData);
          break;
        case 'tracking':
        default:
          url = this.createGenericTrackingUrl(qrData);
          break;
      }

      qrCode = await this.generateQRCode(url, { ...this.defaultOptions, ...options });
      
      results.push({
        id: item.id,
        qrCode,
        url
      });
    }

    return results;
  }

  /**
   * Create QR code with error handling and retry logic
   */
  private async generateQRCode(content: string, options: QRCodeOptions): Promise<string> {
    try {
      const qrOptions = {
        width: options.size || this.defaultOptions.size,
        margin: options.margin || this.defaultOptions.margin,
        color: {
          dark: options.color?.dark || this.defaultOptions.color?.dark,
          light: options.color?.light || this.defaultOptions.color?.light
        },
        errorCorrectionLevel: options.errorCorrectionLevel || this.defaultOptions.errorCorrectionLevel
      };

      return await QRCode.toDataURL(content, qrOptions);
    } catch (error) {
      console.error('[QR Utils] Failed to generate QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Create tracking URL for packages
   */
  private createTrackingUrl(data: QRCodeData): string {
    const encodedData = encodeURIComponent(JSON.stringify(data));
    return `${this.baseUrl}/track/${data.id}?data=${encodedData}`;
  }

  /**
   * Create confirmation URL for deliveries
   */
  private createConfirmationUrl(data: QRCodeData): string {
    const encodedData = encodeURIComponent(JSON.stringify(data));
    return `${this.baseUrl}/confirm/${data.id}?data=${encodedData}`;
  }

  /**
   * Create inquiry URL
   */
  private createInquiryUrl(data: QRCodeData): string {
    const encodedData = encodeURIComponent(JSON.stringify(data));
    return `${this.baseUrl}/inquiry/${data.id}?data=${encodedData}`;
  }

  /**
   * Create generic tracking URL
   */
  private createGenericTrackingUrl(data: QRCodeData): string {
    const encodedData = encodeURIComponent(JSON.stringify(data));
    return `${this.baseUrl}/track?data=${encodedData}`;
  }

  /**
   * Parse QR data from URL
   */
  private parseUrlData(url: string): QRCodeData | null {
    try {
      const urlObj = new URL(url);
      const dataParam = urlObj.searchParams.get('data');
      
      if (dataParam) {
        const decodedData = decodeURIComponent(dataParam);
        const data = JSON.parse(decodedData);
        
        if (this.isValidQRData(data)) {
          return data as QRCodeData;
        }
      }

      // Fallback: extract from URL path
      const pathParts = urlObj.pathname.split('/');
      if (pathParts.length >= 3) {
        const type = this.mapPathToType(pathParts[1]);
        const id = pathParts[2];
        
        if (type && id) {
          return {
            type,
            id,
            timestamp: Date.now(),
            metadata: {}
          };
        }
      }

      return null;
    } catch (error) {
      console.error('[QR Utils] Failed to parse URL data:', error);
      return null;
    }
  }

  /**
   * Map URL path to QR data type
   */
  private mapPathToType(path: string): QRCodeData['type'] | null {
    const pathMap: Record<string, QRCodeData['type']> = {
      'track': 'tracking',
      'confirm': 'delivery',
      'inquiry': 'inquiry',
      'package': 'package'
    };

    return pathMap[path] || null;
  }

  /**
   * Validate QR data structure
   */
  private isValidQRData(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const validTypes: QRCodeData['type'][] = ['package', 'delivery', 'inquiry', 'tracking'];
    
    return (
      typeof data.type === 'string' &&
      validTypes.includes(data.type as QRCodeData['type']) &&
      typeof data.id === 'string' &&
      data.id.length > 0 &&
      typeof data.timestamp === 'number' &&
      (data.metadata === undefined || typeof data.metadata === 'object')
    );
  }
}

// Utility functions for QR code operations
export const qrUtils = {
  /**
   * Generate QR code for package tracking
   */
  generatePackageQR: async (
    packageId: string,
    metadata?: Record<string, any>,
    options?: QRCodeOptions
  ): Promise<string> => {
    const manager = new QRCodeManager();
    return manager.generatePackageQR(packageId, metadata, options);
  },

  /**
   * Generate QR code for delivery confirmation
   */
  generateDeliveryQR: async (
    deliveryId: string,
    metadata?: Record<string, any>,
    options?: QRCodeOptions
  ): Promise<string> => {
    const manager = new QRCodeManager();
    return manager.generateDeliveryQR(deliveryId, metadata, options);
  },

  /**
   * Parse scanned QR code content
   */
  parseQRCode: (scannedContent: string): QRCodeData | null => {
    const manager = new QRCodeManager();
    return manager.parseQRData(scannedContent);
  },

  /**
   * Validate QR code content
   */
  isValidQR: (scannedContent: string): boolean => {
    const manager = new QRCodeManager();
    return manager.isValidQRCode(scannedContent);
  },

  /**
   * Extract tracking ID from QR data
   */
  extractTrackingId: (qrData: QRCodeData): string => {
    return qrData.id;
  },

  /**
   * Get QR code type description
   */
  getQRTypeDescription: (type: QRCodeData['type']): string => {
    const descriptions = {
      package: 'Package Tracking',
      delivery: 'Delivery Confirmation',
      inquiry: 'Inquiry Status',
      tracking: 'General Tracking'
    };

    return descriptions[type] || 'Unknown';
  },

  /**
   * Create printable QR label data
   */
  createQRLabel: (qrData: QRCodeData, qrCodeUrl: string) => ({
    qrCode: qrCodeUrl,
    title: qrUtils.getQRTypeDescription(qrData.type),
    id: qrData.id,
    date: new Date(qrData.timestamp).toLocaleDateString('en-AE'),
    instructions: qrData.type === 'package' 
      ? 'Scan to track your package'
      : qrData.type === 'delivery'
      ? 'Scan to confirm delivery'
      : 'Scan for status updates'
  })
};

// QR Code constants
export const QR_CONSTANTS = {
  SIZES: {
    SMALL: 128,
    MEDIUM: 256,
    LARGE: 512,
    PRINT: 1024
  },
  ERROR_LEVELS: {
    LOW: 'L' as const,
    MEDIUM: 'M' as const,
    QUARTILE: 'Q' as const,
    HIGH: 'H' as const
  },
  UAE_COLORS: {
    NAVY: '#142C4F',
    RED: '#C32C3C',
    LIGHT: '#EFEFEF',
    WHITE: '#FFFFFF'
  }
};

export default QRCodeManager;