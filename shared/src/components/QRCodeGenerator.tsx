'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeManager, QRCodeData, QR_CONSTANTS } from '../qr-utils';

interface QRCodeGeneratorProps {
  type: QRCodeData['type'];
  id: string;
  metadata?: Record<string, any>;
  size?: number;
  showLabel?: boolean;
  showDownload?: boolean;
  className?: string;
  onGenerated?: (qrData: { qrCode: string; trackingUrl: string }) => void;
  onError?: (error: string) => void;
}

interface QRGenerationOptions {
  size: number;
  errorLevel: 'L' | 'M' | 'Q' | 'H';
  margin: number;
  colorDark: string;
  colorLight: string;
}

export default function QRCodeGenerator({
  type,
  id,
  metadata = {},
  size = QR_CONSTANTS.SIZES.MEDIUM,
  showLabel = true,
  showDownload = true,
  className = '',
  onGenerated,
  onError
}: QRCodeGeneratorProps) {
  const [qrCode, setQrCode] = useState<string>('');
  const [trackingUrl, setTrackingUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [options, setOptions] = useState<QRGenerationOptions>({
    size,
    errorLevel: 'M',
    margin: 2,
    colorDark: QR_CONSTANTS.UAE_COLORS.NAVY,
    colorLight: QR_CONSTANTS.UAE_COLORS.WHITE
  });

  const qrManager = new QRCodeManager();

  useEffect(() => {
    generateQRCode();
  }, [type, id, JSON.stringify(metadata), JSON.stringify(options)]);

  const generateQRCode = async () => {
    if (!type || !id) return;

    setIsLoading(true);
    setError('');

    try {
      let qrCodeDataUrl: string;
      let url: string;

      const qrOptions = {
        size: options.size,
        margin: options.margin,
        color: {
          dark: options.colorDark,
          light: options.colorLight
        },
        errorCorrectionLevel: options.errorLevel
      };

      // Generate QR code based on type
      switch (type) {
        case 'package':
          qrCodeDataUrl = await qrManager.generatePackageQR(id, metadata, qrOptions);
          url = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/track/${id}`;
          break;
        case 'delivery':
          qrCodeDataUrl = await qrManager.generateDeliveryQR(id, metadata, qrOptions);
          url = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/confirm/${id}`;
          break;
        case 'inquiry':
          qrCodeDataUrl = await qrManager.generateInquiryQR(id, metadata, qrOptions);
          url = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/inquiry/${id}`;
          break;
        case 'tracking':
        default:
          qrCodeDataUrl = await qrManager.generateTrackingQR(id, metadata, qrOptions);
          url = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/track?id=${id}`;
          break;
      }

      setQrCode(qrCodeDataUrl);
      setTrackingUrl(url);

      if (onGenerated) {
        onGenerated({ qrCode: qrCodeDataUrl, trackingUrl: url });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate QR code';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCode) return;

    const link = document.createElement('a');
    link.download = `qr-${type}-${id}.png`;
    link.href = qrCode;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const getTypeLabel = (type: QRCodeData['type']): string => {
    const labels = {
      package: 'Package Tracking',
      delivery: 'Delivery Confirmation',
      inquiry: 'Inquiry Status',
      tracking: 'General Tracking'
    };
    return labels[type] || 'QR Code';
  };

  const getInstructions = (type: QRCodeData['type']): string => {
    const instructions = {
      package: 'Scan to track your package',
      delivery: 'Scan to confirm delivery',
      inquiry: 'Scan for status updates',
      tracking: 'Scan for tracking information'
    };
    return instructions[type] || 'Scan for information';
  };

  if (isLoading) {
    return (
      <div className={`qr-generator loading ${className}`}>
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#142C4F] mb-4"></div>
          <p className="text-gray-600">Generating QR code...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`qr-generator error ${className}`}>
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border-2 border-red-200">
          <div className="text-red-600 text-2xl mb-2">⚠️</div>
          <p className="text-red-600 text-center">{error}</p>
          <button
            onClick={generateQRCode}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`qr-generator ${className}`}>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        {showLabel && (
          <div className="bg-[#142C4F] text-white px-4 py-3">
            <h3 className="font-semibold text-lg">{getTypeLabel(type)}</h3>
            <p className="text-sm text-blue-100">{getInstructions(type)}</p>
          </div>
        )}

        {/* QR Code Display */}
        <div className="p-6">
          <div className="flex flex-col items-center">
            {qrCode && (
              <img
                src={qrCode}
                alt={`QR Code for ${type} ${id}`}
                className="border border-gray-200 rounded-lg mb-4"
                style={{ width: options.size, height: options.size }}
              />
            )}

            {/* ID Display */}
            <div className="text-center mb-4">
              <p className="text-sm text-gray-500 uppercase tracking-wide">ID</p>
              <p className="font-mono font-medium text-gray-900 text-lg">{id}</p>
            </div>

            {/* URL Display */}
            <div className="w-full mb-4">
              <p className="text-sm text-gray-500 mb-2">Tracking URL:</p>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                <input
                  type="text"
                  value={trackingUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-gray-700 font-mono"
                />
                <button
                  onClick={() => copyToClipboard(trackingUrl)}
                  className="px-3 py-1 text-xs bg-[#142C4F] text-white rounded hover:bg-[#1e3a5f] transition-colors"
                  title="Copy URL"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 w-full">
              {showDownload && (
                <button
                  onClick={downloadQRCode}
                  className="flex-1 px-4 py-2 bg-[#C32C3C] text-white rounded hover:bg-[#a82633] transition-colors text-sm font-medium"
                >
                  Download QR
                </button>
              )}
              <button
                onClick={generateQRCode}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>

        {/* Customization Options */}
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
              Customization Options
              <span className="float-right group-open:rotate-180 transition-transform">▼</span>
            </summary>
            
            <div className="mt-4 space-y-4">
              {/* Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Size: {options.size}px
                </label>
                <input
                  type="range"
                  min={QR_CONSTANTS.SIZES.SMALL}
                  max={QR_CONSTANTS.SIZES.LARGE}
                  step="32"
                  value={options.size}
                  onChange={(e) => setOptions(prev => ({ ...prev, size: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>

              {/* Error Correction Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Error Correction
                </label>
                <select
                  value={options.errorLevel}
                  onChange={(e) => setOptions(prev => ({ ...prev, errorLevel: e.target.value as 'L' | 'M' | 'Q' | 'H' }))}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                >
                  <option value="L">Low (7%)</option>
                  <option value="M">Medium (15%)</option>
                  <option value="Q">Quartile (25%)</option>
                  <option value="H">High (30%)</option>
                </select>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dark Color
                  </label>
                  <input
                    type="color"
                    value={options.colorDark}
                    onChange={(e) => setOptions(prev => ({ ...prev, colorDark: e.target.value }))}
                    className="w-full h-10 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Light Color
                  </label>
                  <input
                    type="color"
                    value={options.colorLight}
                    onChange={(e) => setOptions(prev => ({ ...prev, colorLight: e.target.value }))}
                    className="w-full h-10 border border-gray-300 rounded"
                  />
                </div>
              </div>

              {/* Margin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Margin: {options.margin}
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={options.margin}
                  onChange={(e) => setOptions(prev => ({ ...prev, margin: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>

              {/* Reset Button */}
              <button
                onClick={() => setOptions({
                  size,
                  errorLevel: 'M',
                  margin: 2,
                  colorDark: QR_CONSTANTS.UAE_COLORS.NAVY,
                  colorLight: QR_CONSTANTS.UAE_COLORS.WHITE
                })}
                className="w-full px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
              >
                Reset to Defaults
              </button>
            </div>
          </details>
        </div>

        {/* Metadata Display */}
        {Object.keys(metadata).length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50 p-4">
            <details>
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                Additional Information
              </summary>
              <div className="mt-2 text-xs text-gray-600">
                <pre className="whitespace-pre-wrap bg-gray-100 p-2 rounded border overflow-x-auto">
                  {JSON.stringify(metadata, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}