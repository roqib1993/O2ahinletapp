import { useState, useEffect } from 'react';
import { CalibrationSession, PlantItemData } from '../App';
import { Save, RotateCcw, ChevronRight, ChevronLeft, CheckCircle, X, Plus, Minus } from 'lucide-react';

interface CalibrationFormProps {
  onSubmit: (session: CalibrationSession) => void;
  editingSession?: CalibrationSession | null;
  onCancelEdit?: () => void;
}

const plantItems = [
  '7BG-AE-562',
  '7BG-AE-563',
  '7BG-AE-564',
  '7BG-AE-565',
  '7BG-AE-566',
  '7BG-AE-567',
  '7BG-AE-568',
  '7BG-AE-569',
];

const channelAItems = ['7BG-AE-562', '7BG-AE-563', '7BG-AE-564', '7BG-AE-568'];
const channelBItems = ['7BG-AE-565', '7BG-AE-566', '7BG-AE-567', '7BG-AE-569'];

const STEPS = ['Pre-Calibration', 'Calibration', 'Post-Calibration', 'Session Finalization'];

export function CalibrationForm({ onSubmit, editingSession, onCancelEdit }: CalibrationFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [plantItemsData, setPlantItemsData] = useState<PlantItemData[]>(
    plantItems.map(item => ({
      plantItem: item,
      o2BeforeCalibration: '',
      o2AfterCalibration: '',
      calibrationO2Span: '',
      calibrationO2Zero: '',
      gasRatioSpanBefore: '',
      gasRatioSpanAfter: '',
      gasRatioZeroBefore: '',
      gasRatioZeroAfter: '',
      cellTemperature: '',
      cellLifetime: '',
      cellVoltage: '',
      cellResistance: '',
    }))
  );
  const [calGasBottlePressureSpan, setCalGasBottlePressureSpan] = useState('');
  const [calGasBottlePressureZero, setCalGasBottlePressureZero] = useState('');
  const [calGasRegulatorPressureSpan, setCalGasRegulatorPressureSpan] = useState('');
  const [calGasRegulatorPressureZero, setCalGasRegulatorPressureZero] = useState('');
  const [technicians, setTechnicians] = useState<string[]>(['']);
  const [remarks, setRemarks] = useState('');

  // Load editing session data
  useEffect(() => {
    if (editingSession) {
      setPlantItemsData(editingSession.plantItems);
      setCalGasBottlePressureSpan(editingSession.calGasBottlePressureSpan);
      setCalGasBottlePressureZero(editingSession.calGasBottlePressureZero);
      setCalGasRegulatorPressureSpan(editingSession.calGasRegulatorPressureSpan);
      setCalGasRegulatorPressureZero(editingSession.calGasRegulatorPressureZero);
      // Load technicians from editing session
      const loadedTechnicians = [
        editingSession.technician1,
        editingSession.technician2,
        editingSession.technician3
      ].filter(Boolean);
      setTechnicians(loadedTechnicians.length > 0 ? loadedTechnicians : ['']);
      setRemarks(editingSession.remarks);
      setCurrentStep(0);
    }
  }, [editingSession]);

  const totalSteps = STEPS.length;
  const isLastStep = currentStep === totalSteps - 1;

  const handlePlantItemChange = (plantItemIndex: number, field: keyof PlantItemData, value: string) => {
    const updatedData = [...plantItemsData];
    updatedData[plantItemIndex] = {
      ...updatedData[plantItemIndex],
      [field]: value,
    };
    setPlantItemsData(updatedData);
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const calculateChannelReadings = () => {
    // Channel A: average of 7BG-AE-562, 7BG-AE-563, 7BG-AE-564, 7BG-AE-568
    const channelAData = plantItemsData.filter(item => channelAItems.includes(item.plantItem));
    const channelABeforeValues = channelAData
      .map(item => parseFloat(item.o2BeforeCalibration))
      .filter(val => !isNaN(val));
    const channelAAfterValues = channelAData
      .map(item => parseFloat(item.o2AfterCalibration))
      .filter(val => !isNaN(val));

    const channelABefore = channelABeforeValues.length > 0
      ? channelABeforeValues.reduce((a, b) => a + b, 0) / channelABeforeValues.length
      : 0;
    const channelAAfter = channelAAfterValues.length > 0
      ? channelAAfterValues.reduce((a, b) => a + b, 0) / channelAAfterValues.length
      : 0;

    // Channel B: average of 7BG-AE-565, 7BG-AE-566, 7BG-AE-567, 7BG-AE-569
    const channelBData = plantItemsData.filter(item => channelBItems.includes(item.plantItem));
    const channelBBeforeValues = channelBData
      .map(item => parseFloat(item.o2BeforeCalibration))
      .filter(val => !isNaN(val));
    const channelBAfterValues = channelBData
      .map(item => parseFloat(item.o2AfterCalibration))
      .filter(val => !isNaN(val));

    const channelBBefore = channelBBeforeValues.length > 0
      ? channelBBeforeValues.reduce((a, b) => a + b, 0) / channelBBeforeValues.length
      : 0;
    const channelBAfter = channelBAfterValues.length > 0
      ? channelBAfterValues.reduce((a, b) => a + b, 0) / channelBAfterValues.length
      : 0;

    // Channel C: average of A and B
    const channelCBefore = (channelABefore + channelBBefore) / 2;
    const channelCAfter = (channelAAfter + channelBAfter) / 2;

    return {
      channelABefore,
      channelAAfter,
      channelBBefore,
      channelBAfter,
      channelCBefore,
      channelCAfter,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const session: CalibrationSession = {
      id: editingSession?.id || Date.now().toString(),
      timestamp: editingSession?.timestamp || new Date().toISOString(),
      plantItems: plantItemsData,
      channelReadings: calculateChannelReadings(),
      calGasBottlePressureSpan,
      calGasBottlePressureZero,
      calGasRegulatorPressureSpan,
      calGasRegulatorPressureZero,
      technician1: technicians[0] || '',
      technician2: technicians[1] || '',
      technician3: technicians[2] || '',
      remarks,
    };

    onSubmit(session);
    handleReset();
  };

  const handleReset = () => {
    setPlantItemsData(
      plantItems.map(item => ({
        plantItem: item,
        o2BeforeCalibration: '',
        o2AfterCalibration: '',
        calibrationO2Span: '',
        calibrationO2Zero: '',
        gasRatioSpanBefore: '',
        gasRatioSpanAfter: '',
        gasRatioZeroBefore: '',
        gasRatioZeroAfter: '',
        cellTemperature: '',
        cellLifetime: '',
        cellVoltage: '',
        cellResistance: '',
      }))
    );
    setCalGasBottlePressureSpan('');
    setCalGasBottlePressureZero('');
    setCalGasRegulatorPressureSpan('');
    setCalGasRegulatorPressureZero('');
    setTechnicians(['']);
    setRemarks('');
    setCurrentStep(0);
  };

  const handleCancel = () => {
    handleReset();
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  const addTechnician = () => {
    if (technicians.length < 3) {
      setTechnicians([...technicians, '']);
    }
  };

  const removeTechnician = (index: number) => {
    if (technicians.length > 1) {
      setTechnicians(technicians.filter((_, i) => i !== index));
    }
  };

  const updateTechnician = (index: number, value: string) => {
    const updated = [...technicians];
    updated[index] = value;
    setTechnicians(updated);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 overflow-x-hidden">
      {/* Edit Mode Banner */}
      {editingSession && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-amber-900">Editing Session from {new Date(editingSession.timestamp).toLocaleString()}</p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
            title="Cancel editing"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-indigo-900">
            Step {currentStep + 1} of {totalSteps}
          </h3>
          <span className="text-indigo-600">
            {STEPS[currentStep]}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {STEPS.map((step, index) => (
            <button
              key={step}
              type="button"
              onClick={() => setCurrentStep(index)}
              className={`text-xs px-3 py-1.5 rounded transition-colors flex items-center gap-1 ${
                index === currentStep
                  ? 'bg-indigo-600 text-white'
                  : index < currentStep
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {index < currentStep && <CheckCircle className="w-3 h-3" />}
              {step}
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 0 && (
        <>
          {/* Pre-Calibration Step */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-200">
            <h3 className="text-blue-900 mb-2">🔵 Pre-Calibration Measurements</h3>
            <p className="text-gray-700 mb-4">
              Record initial O2 readings, gas ratios, and calibration gas pressures for all plant items.
            </p>
          </div>

          {/* Cal Gas Pressure (Session Level) */}
          <div className="bg-white p-6 rounded-lg border-2 border-indigo-200">
            <h4 className="text-indigo-900 mb-4">📊 Calibration Gas Pressure (Session Level)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Bottle Pressure - Span (psi)</label>
                <input
                  type="number"
                  step="0.1"
                  value={calGasBottlePressureSpan}
                  onChange={(e) => setCalGasBottlePressureSpan(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Bottle Pressure - Zero (psi)</label>
                <input
                  type="number"
                  step="0.1"
                  value={calGasBottlePressureZero}
                  onChange={(e) => setCalGasBottlePressureZero(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Regulator Outlet Pressure - Span (psi)</label>
                <input
                  type="number"
                  step="0.1"
                  value={calGasRegulatorPressureSpan}
                  onChange={(e) => setCalGasRegulatorPressureSpan(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Regulator Outlet Pressure - Zero (psi)</label>
                <input
                  type="number"
                  step="0.1"
                  value={calGasRegulatorPressureZero}
                  onChange={(e) => setCalGasRegulatorPressureZero(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0.0"
                />
              </div>
            </div>
          </div>

          {/* O2 Readings Before - Big Card */}
          <div className="bg-white p-6 rounded-lg border-2 border-indigo-200">
            <h4 className="text-indigo-900 mb-4">📊 O2 Readings Before Calibration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {plantItemsData.map((item, index) => (
                <div key={item.plantItem} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-gray-700 mb-2 text-sm">{item.plantItem}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.o2BeforeCalibration}
                    onChange={(e) => handlePlantItemChange(index, 'o2BeforeCalibration', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Gas Ratios Before - Big Card */}
          <div className="bg-white p-6 rounded-lg border-2 border-indigo-200">
            <h4 className="text-indigo-900 mb-4">📊 Gas Ratios Before Calibration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {plantItemsData.map((item, index) => (
                <div key={item.plantItem} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h5 className="text-gray-700 mb-3 text-sm">{item.plantItem}</h5>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-600 mb-1 text-xs">Span</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.gasRatioSpanBefore}
                        onChange={(e) => handlePlantItemChange(index, 'gasRatioSpanBefore', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1 text-xs">Zero</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.gasRatioZeroBefore}
                        onChange={(e) => handlePlantItemChange(index, 'gasRatioZeroBefore', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {currentStep === 1 && (
        <>
          {/* Calibration Step */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border-2 border-purple-200">
            <h3 className="text-purple-900 mb-2">⚙️ Calibration Readings</h3>
            <p className="text-gray-700 mb-4">
              Record calibration O2 span and zero readings for all plant items.
            </p>
          </div>

          {/* Plant Items Calibration Data */}
          <div className="space-y-4">
            {plantItemsData.map((item, index) => (
              <div key={item.plantItem} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-indigo-900 mb-4">🏭 {item.plantItem}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2">Calibration O2 Span (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.calibrationO2Span}
                      onChange={(e) => handlePlantItemChange(index, 'calibrationO2Span', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">Calibration O2 Zero (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.calibrationO2Zero}
                      onChange={(e) => handlePlantItemChange(index, 'calibrationO2Zero', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {currentStep === 2 && (
        <>
          {/* Post-Calibration Step */}
          <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg border-2 border-green-200">
            <h3 className="text-green-900 mb-2">✅ Post-Calibration Measurements</h3>
            <p className="text-gray-700 mb-4">
              Record final O2 readings, gas ratios, and cell measurements for all plant items.
            </p>
          </div>

          {/* O2 Readings After - Big Card */}
          <div className="bg-white p-6 rounded-lg border-2 border-indigo-200">
            <h4 className="text-indigo-900 mb-4">📊 O2 Readings After Calibration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {plantItemsData.map((item, index) => (
                <div key={item.plantItem} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-gray-700 mb-2 text-sm">{item.plantItem}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.o2AfterCalibration}
                    onChange={(e) => handlePlantItemChange(index, 'o2AfterCalibration', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Gas Ratios and Cell Measurements - Big Card */}
          <div className="bg-white p-6 rounded-lg border-2 border-indigo-200">
            <h4 className="text-indigo-900 mb-4">📊 Gas Ratios and Cell Measurements</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {plantItemsData.map((item, index) => (
                <div key={item.plantItem} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h5 className="text-gray-700 mb-3 text-sm">{item.plantItem}</h5>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-600 mb-1 text-xs">Voltage (mV)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={item.cellVoltage}
                        onChange={(e) => handlePlantItemChange(index, 'cellVoltage', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1 text-xs">Temp (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={item.cellTemperature}
                        onChange={(e) => handlePlantItemChange(index, 'cellTemperature', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        placeholder="0.0"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1 text-xs">Gas Ratio Span</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.gasRatioSpanAfter}
                        onChange={(e) => handlePlantItemChange(index, 'gasRatioSpanAfter', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1 text-xs">Gas Ratio Zero</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.gasRatioZeroAfter}
                        onChange={(e) => handlePlantItemChange(index, 'gasRatioZeroAfter', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1 text-xs">Lifetime (mo)</label>
                      <input
                        type="number"
                        value={item.cellLifetime}
                        onChange={(e) => handlePlantItemChange(index, 'cellLifetime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1 text-xs">Resistance (Ω)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={item.cellResistance}
                        onChange={(e) => handlePlantItemChange(index, 'cellResistance', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        placeholder="0.0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {currentStep === 3 && (
        <>
          {/* Session Finalization Step */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border-2 border-green-200">
            <h3 className="text-green-900 mb-2">📋 Session Finalization</h3>
            <p className="text-gray-700 mb-4">
              Complete the session by adding technician information and remarks.
            </p>
          </div>

          {/* Technicians */}
          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h4 className="text-indigo-900 text-sm sm:text-base">👥 Technician Information</h4>
              {technicians.length < 3 && (
                <button
                  type="button"
                  onClick={addTechnician}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-xs sm:text-sm"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Add Technician</span>
                  <span className="sm:hidden">Add</span>
                </button>
              )}
            </div>
            <div className="space-y-2 sm:space-y-3">
              {technicians.map((tech, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={tech}
                    onChange={(e) => updateTechnician(index, e.target.value)}
                    className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder={`Technician ${index + 1} name`}
                  />
                  {technicians.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTechnician(index)}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      title="Remove technician"
                    >
                      <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
            <h4 className="text-indigo-900 mb-3 sm:mb-4 text-sm sm:text-base">📝 Remarks</h4>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              rows={4}
              placeholder="Add any additional notes or observations..."
            />
          </div>
        </>
      )}

      {/* Navigation Buttons */}
      <div className="flex flex-row justify-between items-center gap-2 pt-4 flex-wrap">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
          <span className="sm:hidden">Prev</span>
        </button>
        
        {!isLastStep && (
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset</span>
        </button>
        
        {isLastStep && (
          <button
            type="submit"
            className="flex items-center gap-1 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">{editingSession ? 'Update Session' : 'Save Session'}</span>
            <span className="sm:hidden">{editingSession ? 'Update' : 'Save'}</span>
          </button>
        )}
      </div>
    </form>
  );
}