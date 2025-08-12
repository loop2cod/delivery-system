// QR Code utilities for package tracking
import QRCode from 'qrcode';

export interface QRCodeData {
  type: 'package' | 'delivery' | 'inquiry' | 'tracking';
  id: string;
  metadata?: Record<string, any>;
  timestamp: string;
  signature?: string;
}

export interface QROptions {
  size?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export class QRCodeManager {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async generatePackageQR(
    packageId: string, 
    metadata: Record<string, any> = {}, 
    options: QROptions = {}
  ): Promise<string> {
    const qrData: QRCodeData = {
      type: 'package',
      id: packageId,
      metadata,
      timestamp: new Date().toISOString()
    };

    const qrContent = this.encodeQRData(qrData);
    return this.generateQRCode(qrContent, options);
  }

  async generateDeliveryQR(
    deliveryId: string, 
    metadata: Record<string, any> = {}, 
    options: QROptions = {}
  ): Promise<string> {
    const qrData: QRCodeData = {
      type: 'delivery',
      id: deliveryId,
      metadata,
      timestamp: new Date().toISOString()
    };

    const qrContent = this.encodeQRData(qrData);
    return this.generateQRCode(qrContent, options);
  }

  async generateInquiryQR(
    inquiryId: string, 
    metadata: Record<string, any> = {}, 
    options: QROptions = {}
  ): Promise<string> {
    const qrData: QRCodeData = {
      type: 'inquiry',
      id: inquiryId,
      metadata,
      timestamp: new Date().toISOString()
    };

    const qrContent = this.encodeQRData(qrData);
    return this.generateQRCode(qrContent, options);
  }

  async generateTrackingQR(
    trackingId: string, 
    metadata: Record<string, any> = {}, 
    options: QROptions = {}
  ): Promise<string> {
    const qrData: QRCodeData = {
      type: 'tracking',
      id: trackingId,
      metadata,
      timestamp: new Date().toISOString()
    };

    const qrContent = this.encodeQRData(qrData);
    return this.generateQRCode(qrContent, options);
  }

  async generateBatchQRCodes(
    items: Array<{
      type: 'package' | 'delivery' | 'inquiry' | 'tracking';
      id: string;
      metadata?: Record<string, any>;
    }>,
    options: QROptions = {}
  ): Promise<Array<{ id: string; type: string; qrCode: string; trackingUrl: string }>> {
    const results = [];

    for (const item of items) {
      try {
        let qrCode: string;
        let trackingUrl: string;

        switch (item.type) {
          case 'package':
            qrCode = await this.generatePackageQR(item.id, item.metadata, options);
            trackingUrl = `${this.baseUrl}/track/${item.id}`;
            break;
          case 'delivery':
            qrCode = await this.generateDeliveryQR(item.id, item.metadata, options);
            trackingUrl = `${this.baseUrl}/confirm/${item.id}`;
            break;
          case 'inquiry':
            qrCode = await this.generateInquiryQR(item.id, item.metadata, options);
            trackingUrl = `${this.baseUrl}/inquiry/${item.id}`;
            break;
          case 'tracking':
          default:
            qrCode = await this.generateTrackingQR(item.id, item.metadata, options);
            trackingUrl = `${this.baseUrl}/track?id=${item.id}`;
            break;
        }

        results.push({
          id: item.id,
          type: item.type,
          qrCode,
          trackingUrl
        });
      } catch (error) {
        console.error(`Failed to generate QR for ${item.type}:${item.id}`, error);
      }
    }

    return results;
  }

  parseQRData(qrContent: string): QRCodeData | null {
    try {
      // Check if it's a URL-based QR or JSON-based QR
      if (qrContent.startsWith('http')) {
        return this.parseUrlQR(qrContent);
      } else {
        return this.parseJsonQR(qrContent);
      }
    } catch (error) {
      console.error('Failed to parse QR data:', error);
      return null;
    }
  }

  private encodeQRData(data: QRCodeData): string {
    // Create a URL-based QR code for better compatibility
    const params = new URLSearchParams({
      type: data.type,
      id: data.id,
      timestamp: data.timestamp
    });

    if (data.metadata && Object.keys(data.metadata).length > 0) {
      params.set('metadata', JSON.stringify(data.metadata));
    }

    return `${this.baseUrl}/qr?${params.toString()}`;
  }

  private async generateQRCode(content: string, options: QROptions = {}): Promise<string> {
    const qrOptions = {
      width: options.size || 256,
      margin: options.margin || 2,
      errorCorrectionLevel: options.errorCorrectionLevel || 'M' as const,
      type: 'image/png' as const
    };

    try {
      // Generate QR code as base64 data URL
      const qrCodeDataURL = await QRCode.toDataURL(content, qrOptions);
      return qrCodeDataURL;
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      throw new Error('QR code generation failed');
    }
  }

  private parseUrlQR(url: string): QRCodeData | null {
    try {
      const urlObj = new URL(url);
      
      if (!urlObj.pathname.includes('/qr')) {
        return null;
      }

      const params = urlObj.searchParams;
      const type = params.get('type') as QRCodeData['type'];
      const id = params.get('id');
      const timestamp = params.get('timestamp');
      const metadataStr = params.get('metadata');

      if (!type || !id || !timestamp) {
        return null;
      }

      const metadata = metadataStr ? JSON.parse(metadataStr) : {};

      return {
        type,
        id,
        timestamp,
        metadata
      };
    } catch (error) {
      return null;
    }
  }

  private parseJsonQR(jsonStr: string): QRCodeData | null {
    try {
      const data = JSON.parse(jsonStr);
      
      if (!data.type || !data.id || !data.timestamp) {
        return null;
      }

      return data as QRCodeData;
    } catch (error) {
      return null;
    }
  }
}

export default QRCodeManager;