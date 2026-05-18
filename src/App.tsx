import { useState, useEffect } from 'react';
import { CalibrationForm } from './components/CalibrationForm';
import { SessionsList } from './components/SessionsList';
import { ClipboardList, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from './utils/supabase/info';
import { Toaster } from 'sonner@2.0.3';

export interface PlantItemData {
  plantItem: string;
  o2BeforeCalibration: string;
  o2AfterCalibration: string;
  calibrationO2Span: string;
  calibrationO2Zero: string;
  gasRatioSpanBefore: string;
  gasRatioSpanAfter: string;
  gasRatioZeroBefore: string;
  gasRatioZeroAfter: string;
  cellTemperature: string;
  cellLifetime: string;
  cellVoltage: string;
  cellResistance: string;
}

export interface ChannelReadings {
  channelABefore: number;
  channelAAfter: number;
  channelBBefore: number;
  channelBAfter: number;
  channelCBefore: number;
  channelCAfter: number;
}

export interface CalibrationSession {
  id: string;
  timestamp: string;
  plantItems: PlantItemData[];
  channelReadings: ChannelReadings;
  calGasBottlePressureSpan: string;
  calGasBottlePressureZero: string;
  calGasRegulatorPressureSpan: string;
  calGasRegulatorPressureZero: string;
  technician1: string;
  technician2: string;
  technician3: string;
  remarks: string;
}

export default function App() {
  const [sessions, setSessions] = useState<CalibrationSession[]>([]);
  const [activeTab, setActiveTab] = useState<'form' | 'sessions'>('form');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<CalibrationSession | null>(null);

/*  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-e669e2e2`; */
  const serverUrl = https://supabase.afezcloud.us/functions/v1/make-server-e669e2e2;

  // Load sessions from database on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${serverUrl}/sessions`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load sessions: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        // Sessions from getByPrefix come as array of values
        setSessions(data.sessions || []);
      } else {
        throw new Error(data.error || 'Failed to load sessions');
      }
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSession = async (session: CalibrationSession) => {
    try {
      const isEditing = editingSession !== null;
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `${serverUrl}/sessions/${session.id}` : `${serverUrl}/sessions`;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(session),
      });

      if (!response.ok) {
        throw new Error(`Failed to save session: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        if (isEditing) {
          // Update existing session
          setSessions(sessions.map(s => s.id === session.id ? session : s));
          setEditingSession(null);
        } else {
          // Add new session
          setSessions([session, ...sessions]);
        }
        setActiveTab('sessions');
      } else {
        throw new Error(data.error || 'Failed to save session');
      }
    } catch (err) {
      console.error('Error saving session:', err);
      alert(`Error saving session: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleEditSession = (session: CalibrationSession) => {
    setEditingSession(session);
    setActiveTab('form');
  };

  const handleCancelEdit = () => {
    setEditingSession(null);
  };

  const handleDeleteSession = async (id: string) => {
    try {
      const response = await fetch(`${serverUrl}/sessions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setSessions(sessions.filter(session => session.id !== id));
      } else {
        throw new Error(data.error || 'Failed to delete session');
      }
    } catch (err) {
      console.error('Error deleting session:', err);
      alert(`Error deleting session: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 overflow-x-hidden">
      <Toaster position="top-right" richColors />
      <div className="container mx-auto px-4 py-8 max-w-7xl overflow-x-hidden">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-indigo-600 p-2 sm:p-3 rounded-lg">
              <ClipboardList className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-indigo-900 text-lg sm:text-2xl">Calibration Work Activity Documentation</h1>
              <p className="text-gray-600 text-xs sm:text-base">Record and track O2 calibration processes</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-4 sm:mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('form')}
              className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 transition-colors text-sm sm:text-base ${
                activeTab === 'form'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              New Calibration Session
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 transition-colors relative text-sm sm:text-base ${
                activeTab === 'sessions'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Sessions ({sessions.length})
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <p className="text-gray-600">Loading sessions...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-800 mb-4">{error}</p>
                <button
                  onClick={loadSessions}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : activeTab === 'form' ? (
              <CalibrationForm 
                onSubmit={handleAddSession} 
                editingSession={editingSession}
                onCancelEdit={handleCancelEdit}
              />
            ) : (
              <SessionsList 
                sessions={sessions} 
                onDelete={handleDeleteSession}
                onEdit={handleEditSession}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
