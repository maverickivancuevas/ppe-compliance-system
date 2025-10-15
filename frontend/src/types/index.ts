export type UserRole = 'admin' | 'safety_manager';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Camera {
  id: string;
  name: string;
  location: string;
  stream_url?: string;
  status: 'active' | 'inactive' | 'maintenance';
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface DetectionEvent {
  id: string;
  camera_id: string;
  timestamp: string;
  person_detected: boolean;
  hardhat_detected: boolean;
  no_hardhat_detected: boolean;
  safety_vest_detected: boolean;
  no_safety_vest_detected: boolean;
  is_compliant: boolean;
  confidence_scores?: Record<string, number>;
  snapshot_url?: string;
  violation_type?: string;
  created_at: string;
}

export interface Alert {
  id: string;
  detection_event_id: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
}

export interface DetectionStats {
  total_detections: number;
  compliant_count: number;
  violation_count: number;
  compliance_rate: number;
  common_violations: Record<string, number>;
}

export interface StreamFrame {
  type: 'frame' | 'alert';
  camera_id: string;
  frame?: string; // base64 encoded image
  results?: {
    detected_classes: string[];
    is_compliant: boolean;
    safety_status: string;
    violation_type?: string;
    confidence_scores: Record<string, number>;
  };
  alert?: Alert;
  timestamp: string;
}
