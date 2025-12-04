'use client';

import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ScanLine,
  CheckCircle,
  XCircle,
  Clock,
  User,
  MapPin,
  AlertCircle,
  Calendar,
  Camera,
  Keyboard,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { workersAPI, attendanceAPI, camerasAPI } from '@/lib/api';
import { Html5Qrcode } from 'html5-qrcode';

interface Worker {
  id: string;
  account_number: string;
  full_name: string;
  position: string | null;
  contact_number: string | null;
  camera_name: string | null;
  is_active: boolean;
}

interface CameraDevice {
  id: string;
  name: string;
  location: string;
}

interface AttendanceResult {
  id: string;
  worker_name: string;
  account_number: string;
  check_in_time?: string;
  check_out_time?: string;
  hours_worked?: number;
  status: string;
  message: string;
}

export default function ScanQRPage() {
  const [accountNumber, setAccountNumber] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [worker, setWorker] = useState<Worker | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<'check-in' | 'check-out'>('check-in');

  // Camera scanner states
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false); // Prevent multiple scans
  const scannerElementId = 'qr-reader';

  useEffect(() => {
    loadCameras();

    // Cleanup scanner on unmount
    return () => {
      stopScanner();
    };
  }, []);

  const loadCameras = async () => {
    try {
      const data = await camerasAPI.getAll();
      // API returns array directly, not wrapped in object
      setCameras(Array.isArray(data) ? data : data.cameras || []);
    } catch (error) {
      console.error('Failed to load cameras:', error);
      setCameras([]);
    }
  };

  const startScanner = async () => {
    try {
      setCameraError(null);

      // Check if already scanning
      if (isScanning) {
        console.log('Scanner already running');
        return;
      }

      setIsScanning(true);
      processingRef.current = false;

      // Initialize the scanner
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerElementId);
      }

      // Start scanning with rear camera preference
      await scannerRef.current.start(
        { facingMode: "environment" }, // Use rear camera on mobile
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          // Prevent multiple scans of the same code
          if (processingRef.current) {
            return;
          }

          processingRef.current = true;
          console.log('QR Code detected:', decodedText);

          // Stop scanner and process the result
          await stopScanner();
          setAccountNumber(decodedText.toUpperCase());

          // Automatically search for the worker
          await searchWorker(decodedText.toUpperCase());
        },
        (errorMessage) => {
          // Scanning error - ignore these as they're common during scanning
          // console.log('QR scan error:', errorMessage);
        }
      );
    } catch (err: any) {
      console.error('Failed to start scanner:', err);
      setCameraError(err.message || 'Failed to access camera. Please check permissions.');
      setIsScanning(false);
      processingRef.current = false;
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      setIsScanning(false);
    } catch (err) {
      console.error('Failed to stop scanner:', err);
      setIsScanning(false);
    }
  };

  const searchWorker = async (accountNum: string) => {
    if (!accountNum.trim()) {
      setError('Please enter an account number');
      return;
    }

    setSearching(true);
    setError(null);
    setWorker(null);
    setResult(null);

    try {
      const data = await workersAPI.getByAccountNumber(accountNum.trim());
      setWorker(data);
      setError(null);
    } catch (error: any) {
      console.error('Failed to find worker:', error);
      setError(error.response?.data?.detail || 'Worker not found. Please check the account number.');
      setWorker(null);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = async () => {
    await searchWorker(accountNumber);
  };

  const handleCheckIn = async () => {
    if (!worker) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await attendanceAPI.checkIn({
        account_number: worker.account_number,
        location: location || undefined,
      });

      setResult(data);
      setAccountNumber('');
      setWorker(null);
      setLocation('');

      // Restart scanner if in camera mode
      if (scanMode === 'camera') {
        setTimeout(() => {
          processingRef.current = false;
          startScanner();
        }, 3000); // Wait 3 seconds to show result
      } else {
        processingRef.current = false;
      }
    } catch (error: any) {
      console.error('Failed to check in:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to check in. Please try again.';
      setError(errorMessage);
      processingRef.current = false;

      // If already checked in, allow retry after clearing the error
      if (errorMessage.includes('already checked in')) {
        setTimeout(() => {
          setError(null);
          setWorker(null);
          setAccountNumber('');
        }, 5000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!worker) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await attendanceAPI.checkOut({
        account_number: worker.account_number,
        location: location || undefined,
        notes: notes || undefined,
      });

      setResult(data);
      setAccountNumber('');
      setWorker(null);
      setLocation('');
      setNotes('');

      // Restart scanner if in camera mode
      if (scanMode === 'camera') {
        setTimeout(() => {
          processingRef.current = false;
          startScanner();
        }, 3000); // Wait 3 seconds to show result
      } else {
        processingRef.current = false;
      }
    } catch (error: any) {
      console.error('Failed to check out:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to check out. Please try again.';
      setError(errorMessage);
      processingRef.current = false;

      // If not checked in, allow retry after clearing the error
      if (errorMessage.includes('not checked in')) {
        setTimeout(() => {
          setError(null);
          setWorker(null);
          setAccountNumber('');
        }, 5000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (action === 'check-in') {
      await handleCheckIn();
    } else {
      await handleCheckOut();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !worker) {
      handleSearch();
    }
  };

  const handleScanModeChange = async (mode: 'camera' | 'manual') => {
    setScanMode(mode);

    if (mode === 'camera') {
      await startScanner();
    } else {
      await stopScanner();
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="px-6 py-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ScanLine className="h-7 w-7" />
              Scan QR Code - Attendance Tracking
            </h1>
            <p className="text-sm text-muted-foreground">
              Scan worker QR code with camera or enter account number manually
            </p>
          </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Success Result */}
            {result && (
              <Card className="p-6 bg-green-50 border-green-200">
                <div className="flex items-start gap-4">
                  <div className="bg-green-500 rounded-full p-3">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-green-900 mb-1">
                      {result.message}
                    </h3>
                    <div className="space-y-1 text-sm text-green-700">
                      <p className="font-medium">{result.worker_name} ({result.account_number})</p>
                      {result.check_in_time && (
                        <p>Check In: {formatDate(result.check_in_time)}</p>
                      )}
                      {result.check_out_time && (
                        <p>Check Out: {formatDate(result.check_out_time)}</p>
                      )}
                      {result.hours_worked && (
                        <p className="font-semibold">Hours Worked: {result.hours_worked} hours</p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Error Message */}
            {error && (
              <Card className="p-4 bg-red-50 border-red-200">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <p className="font-medium">{error}</p>
                </div>
              </Card>
            )}

            {/* Camera Error */}
            {cameraError && (
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <div className="flex items-center gap-2 text-yellow-700">
                  <AlertCircle className="h-5 w-5" />
                  <div>
                    <p className="font-medium">{cameraError}</p>
                    <p className="text-xs mt-1">Try using manual mode or check camera permissions in your browser.</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Action Type Selector */}
            <Card className="p-6">
              <Label className="mb-3 block">Select Action</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={action === 'check-in' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => {
                    setAction('check-in');
                    setWorker(null);
                    setError(null);
                    setResult(null);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Check In
                </Button>
                <Button
                  type="button"
                  variant={action === 'check-out' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => {
                    setAction('check-out');
                    setWorker(null);
                    setError(null);
                    setResult(null);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Check Out
                </Button>
              </div>
            </Card>

            {/* Scanner Card */}
            <Card className="p-6">
              <div className="space-y-4">
                {/* Scan Mode Toggle */}
                <div className="flex gap-2 mb-4">
                  <Button
                    type="button"
                    variant={scanMode === 'camera' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => handleScanModeChange('camera')}
                    disabled={loading || searching}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Camera Scan
                  </Button>
                  <Button
                    type="button"
                    variant={scanMode === 'manual' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => handleScanModeChange('manual')}
                    disabled={loading || searching}
                  >
                    <Keyboard className="h-4 w-4 mr-2" />
                    Manual Entry
                  </Button>
                </div>

                {/* Camera Scanner */}
                {scanMode === 'camera' && (
                  <div className="bg-primary/5 border-2 border-dashed border-primary/20 rounded-lg p-4">
                    <div id={scannerElementId} className="w-full rounded-lg overflow-hidden"></div>

                    {!isScanning && (
                      <div className="text-center py-8">
                        <Camera className="h-16 w-16 text-primary mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">Camera QR Scanner</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Click the button below to start scanning QR codes
                        </p>
                        <Button onClick={startScanner}>
                          <Camera className="h-4 w-4 mr-2" />
                          Start Camera
                        </Button>
                      </div>
                    )}

                    {isScanning && (
                      <div className="text-center mt-4">
                        <p className="text-sm text-muted-foreground mb-2">
                          Point camera at worker's QR code
                        </p>
                        <Button variant="outline" onClick={stopScanner}>
                          Stop Camera
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Manual Entry */}
                {scanMode === 'manual' && (
                  <div className="bg-primary/5 border-2 border-dashed border-primary/20 rounded-lg p-8 text-center">
                    <ScanLine className="h-16 w-16 text-primary mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Manual QR Code Entry</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Enter the account number from the worker's QR code
                    </p>

                    <div className="max-w-md mx-auto">
                      <div className="flex gap-2">
                        <Input
                          placeholder="eg. ID 001"
                          value={accountNumber}
                          onChange={(e) => {
                            setAccountNumber(e.target.value.toUpperCase());
                            setError(null);
                          }}
                          onKeyPress={handleKeyPress}
                          className="text-center font-mono text-lg"
                          disabled={loading || searching}
                          autoFocus
                        />
                        <Button
                          onClick={handleSearch}
                          disabled={!accountNumber.trim() || loading || searching}
                        >
                          {searching ? 'Searching...' : 'Search'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Worker Info */}
                {worker && (
                  <div className="border-t pt-4">
                    <div className="bg-card border border-border rounded-lg p-4 mb-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Worker Found
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Name</p>
                          <p className="font-medium">{worker.full_name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Account Number</p>
                          <p className="font-mono font-medium">{worker.account_number}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Position</p>
                          <p className="font-medium">{worker.position || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <p className="font-medium">
                            {worker.is_active ? (
                              <span className="text-green-600 flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                Active
                              </span>
                            ) : (
                              <span className="text-red-600 flex items-center gap-1">
                                <XCircle className="h-4 w-4" />
                                Inactive
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {!worker.is_active && (
                      <Card className="p-4 bg-yellow-50 border-yellow-200 mb-4">
                        <div className="flex items-center gap-2 text-yellow-700">
                          <AlertCircle className="h-5 w-5" />
                          <p className="text-sm font-medium">
                            Warning: This worker is marked as inactive. Please verify before proceeding.
                          </p>
                        </div>
                      </Card>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Site (only for check-in) */}
                      {action === 'check-in' && (
                        <div className="space-y-2">
                          <Label htmlFor="location">
                            Site <span className="text-red-500">*</span>
                          </Label>
                          <select
                            id="location"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                            required
                          >
                            <option value="">Select site...</option>
                            {cameras && cameras.map((camera) => (
                              <option key={camera.id} value={camera.name}>
                                {camera.name} - {camera.location}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Notes (only for check-out) */}
                      {action === 'check-out' && (
                        <div className="space-y-2">
                          <Label htmlFor="notes">
                            Notes <span className="text-muted-foreground text-xs">(Optional)</span>
                          </Label>
                          <Input
                            id="notes"
                            placeholder="Add any notes about the work day..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          />
                        </div>
                      )}

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processing...
                          </>
                        ) : action === 'check-in' ? (
                          <>
                            <CheckCircle className="h-5 w-5 mr-2" />
                            Check In Worker
                          </>
                        ) : (
                          <>
                            <XCircle className="h-5 w-5 mr-2" />
                            Check Out Worker
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setWorker(null);
                          setAccountNumber('');
                          setLocation('');
                          setNotes('');
                          setError(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            </Card>

            {/* Instructions */}
            <Card className="p-6 bg-muted">
              <h3 className="font-semibold mb-3">Instructions</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-bold text-primary">1.</span>
                  <span>Select whether you want to check in or check out a worker</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary">2.</span>
                  <span>Choose Camera Scan mode to use your device camera, or Manual Entry to type the account number</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary">3.</span>
                  <span>For Camera Scan: Click "Start Camera" and point at the worker's QR code</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary">4.</span>
                  <span>For Manual Entry: Type the account number (e.g., WKR-001) and click "Search"</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary">5.</span>
                  <span>Optionally select a site and add notes (for check-out)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary">6.</span>
                  <span>Click the corresponding button to complete the action</span>
                </li>
              </ul>
            </Card>
          </div>
      </main>
    </DashboardLayout>
  );
}
