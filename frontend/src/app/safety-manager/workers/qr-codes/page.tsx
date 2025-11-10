'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  QrCode,
  Download,
  Search,
  Printer,
  Eye,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { workersAPI } from '@/lib/api';

interface Worker {
  id: string;
  account_number: string;
  full_name: string;
  position: string | null;
  contact_number: string | null;
  camera_name: string | null;
  qr_code_url: string;
  is_active: boolean;
  created_at: string;
}

export default function QRCodeManagementPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<Worker[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

  useEffect(() => {
    loadWorkers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = workers.filter(
        (worker) =>
          worker.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          worker.account_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredWorkers(filtered);
    } else {
      setFilteredWorkers(workers);
    }
  }, [searchTerm, workers]);

  const loadWorkers = async () => {
    try {
      const data = await workersAPI.getAll({ is_active: true });
      setWorkers(data.workers);
      setFilteredWorkers(data.workers);
    } catch (error) {
      console.error('Failed to load workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = async (worker: Worker) => {
    try {
      const response = await workersAPI.downloadQR(worker.id);

      // Create blob and download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `QR_${worker.account_number}.png`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download QR code:', error);
      alert('Failed to download QR code');
    }
  };

  const handleDownloadAll = async () => {
    if (!confirm(`Download QR codes for all ${filteredWorkers.length} workers? This may take a moment.`)) {
      return;
    }

    for (const worker of filteredWorkers) {
      await handleDownloadQR(worker);
      // Small delay to avoid overwhelming the browser
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  };

  const handlePrint = (worker: Worker) => {
    setSelectedWorker(worker);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="border-b border-border bg-card print:hidden">
        <div className="px-6 py-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <QrCode className="h-7 w-7" />
              QR Code Management
            </h1>
            <p className="text-sm text-muted-foreground">
              View, download, and print QR codes for worker attendance tracking
            </p>
          </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 print:p-0">
          {/* Search and Bulk Actions */}
          <Card className="p-4 print:hidden">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or account number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleDownloadAll}
                  disabled={filteredWorkers.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download All ({filteredWorkers.length})
                </Button>
              </div>
            </div>
          </Card>

          {/* Instructions */}
          <Card className="p-6 bg-blue-50 border-blue-200 print:hidden">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <QrCode className="h-5 w-5 text-blue-600" />
              QR Code Usage Instructions
            </h3>
            <ul className="space-y-2 text-sm text-blue-900">
              <li className="flex gap-2">
                <span className="font-bold">1.</span>
                <span>Download or print the QR code for each worker</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">2.</span>
                <span>Attach the printed QR code to the worker's hardhat or ID badge</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">3.</span>
                <span>Workers scan their QR code at the entrance for check-in/check-out</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">4.</span>
                <span>Each QR code contains the worker's unique account number (e.g., TUPM-22-001)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">5.</span>
                <span>Recommended: Print on waterproof adhesive labels for durability</span>
              </li>
            </ul>
          </Card>

          {/* QR Codes Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading QR codes...</p>
            </div>
          ) : filteredWorkers.length === 0 ? (
            <Card className="p-12 text-center">
              <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Workers Found</h3>
              <p className="text-muted-foreground">
                {searchTerm
                  ? 'No workers match your search criteria.'
                  : 'No active workers available. Add workers to generate QR codes.'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 print:grid-cols-2">
              {filteredWorkers.map((worker) => (
                <Card key={worker.id} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="text-center space-y-3">
                    {/* Worker Info */}
                    <div className="border-b pb-3">
                      <h3 className="font-bold text-lg">{worker.full_name}</h3>
                      <p className="text-sm font-mono text-muted-foreground">
                        {worker.account_number}
                      </p>
                      {worker.position && (
                        <p className="text-xs text-muted-foreground">{worker.position}</p>
                      )}
                    </div>

                    {/* QR Code */}
                    <div className="bg-white p-3 rounded-lg border-2 border-dashed">
                      {worker.qr_code_url ? (
                        <img
                          src={`http://localhost:8000${worker.qr_code_url}`}
                          alt={`QR Code for ${worker.account_number}`}
                          className="w-full h-auto"
                        />
                      ) : (
                        <div className="bg-gray-100 p-8 rounded-lg">
                          <QrCode className="h-12 w-12 text-gray-400 mx-auto" />
                          <p className="text-xs text-gray-500 mt-2">Not available</p>
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center justify-center gap-1 text-xs">
                      {worker.is_active ? (
                        <>
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span className="text-green-600 font-medium">Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 text-gray-500" />
                          <span className="text-gray-600 font-medium">Inactive</span>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 print:hidden">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleDownloadQR(worker)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handlePrint(worker)}
                      >
                        <Printer className="h-3 w-3 mr-1" />
                        Print
                      </Button>
                    </div>

                    {/* Additional Info */}
                    <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t print:hidden">
                      {worker.camera_name && (
                        <p>📍 {worker.camera_name}</p>
                      )}
                      {worker.contact_number && (
                        <p>📞 {worker.contact_number}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Results Count */}
          {filteredWorkers.length > 0 && (
            <div className="text-sm text-muted-foreground text-center print:hidden">
              Showing {filteredWorkers.length} QR code{filteredWorkers.length !== 1 ? 's' : ''}
              {searchTerm && ' (filtered)'}
            </div>
          )}
      </main>

      {/* Print View - Single QR Code */}
      {selectedWorker && (
        <div className="hidden print:block print:h-screen print:flex print:items-center print:justify-center">
            <div className="text-center p-8">
              <h1 className="text-3xl font-bold mb-2">{selectedWorker.full_name}</h1>
              <p className="text-xl font-mono mb-6">{selectedWorker.account_number}</p>
              {selectedWorker.position && (
                <p className="text-lg mb-6">{selectedWorker.position}</p>
              )}
              <div className="bg-white p-6 border-4 border-black inline-block">
                <img
                  src={`http://localhost:8000${selectedWorker.qr_code_url}`}
                  alt={`QR Code for ${selectedWorker.account_number}`}
                  className="w-64 h-64"
                />
              </div>
              <p className="text-lg font-semibold mt-6">Scan for Attendance</p>
              <p className="text-sm text-gray-600 mt-2">PPE Compliance System</p>
            </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block,
          .print\\:block * {
            visibility: visible;
          }
          .print\\:block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
