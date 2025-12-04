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

  const totalSteps = plantItems.length + 1; // 8 plant items + 1 finalization step
  const isLastStep = currentStep === totalSteps - 1;
  const isPlantItemStep = currentStep < plantItems.length;
  const currentPlantItem = isPlantItemStep ? plantItemsData[currentStep] : plantItemsData[0];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedData = [...plantItemsData];
    updatedData[currentStep] = {
      ...updatedData[currentStep],
      [e.target.name]: e.target.value,
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

    // Channel C: average of Channel A and Channel B
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
      id: editingSession ? editingSession.id : Date.now().toString(),
      timestamp: editingSession ? editingSession.timestamp : new Date().toISOString(),
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
    if (!editingSession) {
      handleReset();
    }
  };

  const handleCancel = () => {
    handleReset();
    if (onCancelEdit) {
      onCancelEdit();
    }
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
            {isPlantItemStep 
              ? `Plant Item ${currentStep + 1} of ${plantItems.length}` 
              : 'Session Finalization'}
          </h3>
          <span className="text-indigo-600">
            {isPlantItemStep ? currentPlantItem.plantItem : 'Complete Session'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 gap-1 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="flex gap-1 min-w-max">
            {plantItems.map((item, index) => (
              <button
                key={item}
                type="button"
                onClick={() => setCurrentStep(index)}
                className={`text-xs px-2 py-1 rounded transition-colors flex-shrink-0 ${
                  index === currentStep
                    ? 'bg-indigo-600 text-white'
                    : index < currentStep
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {index < currentStep && <CheckCircle className="w-3 h-3 inline mr-1" />}
                {item.slice(-3)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentStep(plantItems.length)}
              className={`text-xs px-2 py-1 rounded transition-colors flex-shrink-0 ${
                currentStep === plantItems.length
                  ? 'bg-indigo-600 text-white'
                  : currentStep > plantItems.length
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {currentStep > plantItems.length && <CheckCircle className="w-3 h-3 inline mr-1" />}
              Final
            </button>
          </div>
        </div>
      </div>

      {isPlantItemStep ? (
        <>
          {/* O2 Measurements */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-indigo-900 mb-4">O2 Measurements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">O2 Before Calibration (%)</label>
                <input
                  type="number"
                  step="0.01"
                  name="o2BeforeCalibration"
                  value={currentPlantItem.o2BeforeCalibration}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">O2 After Calibration (%)</label>
                <input
                  type="number"
                  step="0.01"
                  name="o2AfterCalibration"
                  value={currentPlantItem.o2AfterCalibration}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Calibration Readings */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-indigo-900 mb-4">Calibration Readings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">O2 Span (%)</label>
                <input
                  type="number"
                  step="0.01"
                  name="calibrationO2Span"
                  value={currentPlantItem.calibrationO2Span}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">O2 Zero (%)</label>
                <input
                  type="number"
                  step="0.01"
                  name="calibrationO2Zero"
                  value={currentPlantItem.calibrationO2Zero}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Gas Ratios */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-indigo-900 mb-4">Gas Ratios</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-gray-700">Span</h4>
                <div>
                  <label className="block text-gray-700 mb-2">Before Calibration</label>
                  <input
                    type="number"
                    step="0.01"
                    name="gasRatioSpanBefore"
                    value={currentPlantItem.gasRatioSpanBefore}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">After Calibration</label>
                  <input
                    type="number"
                    step="0.01"
                    name="gasRatioSpanAfter"
                    value={currentPlantItem.gasRatioSpanAfter}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-gray-700">Zero</h4>
                <div>
                  <label className="block text-gray-700 mb-2">Before Calibration</label>
                  <input
                    type="number"
                    step="0.01"
                    name="gasRatioZeroBefore"
                    value={currentPlantItem.gasRatioZeroBefore}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">After Calibration</label>
                  <input
                    type="number"
                    step="0.01"
                    name="gasRatioZeroAfter"
                    value={currentPlantItem.gasRatioZeroAfter}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cell Measurements */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-indigo-900 mb-4">Cell Measurements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  name="cellTemperature"
                  value={currentPlantItem.cellTemperature}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Lifetime (months)</label>
                <input
                  type="number"
                  name="cellLifetime"
                  value={currentPlantItem.cellLifetime}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Voltage (mV)</label>
                <input
                  type="number"
                  step="0.1"
                  name="cellVoltage"
                  value={currentPlantItem.cellVoltage}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Resistance (Ω)</label>
                <input
                  type="number"
                  step="0.1"
                  name="cellResistance"
                  value={currentPlantItem.cellResistance}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0.0"
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Session Finalization Step */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border-2 border-green-200">
            <h3 className="text-green-900 mb-2">📋 Session Finalization</h3>
            <p className="text-gray-700 mb-4">
              All plant items have been entered. Please complete the session details below.
            </p>
          </div>

          {/* Calibration Gas Pressure Readings */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-indigo-900 mb-4">Calibration Gas Pressure Readings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-gray-700">Bottle Pressure (psi)</h4>
                <div>
                  <label className="block text-gray-700 mb-2">Span</label>
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
                  <label className="block text-gray-700 mb-2">Zero</label>
                  <input
                    type="number"
                    step="0.1"
                    value={calGasBottlePressureZero}
                    onChange={(e) => setCalGasBottlePressureZero(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0.0"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-gray-700">Regulator Outlet Pressure (psi)</h4>
                <div>
                  <label className="block text-gray-700 mb-2">Span</label>
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
                  <label className="block text-gray-700 mb-2">Zero</label>
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
          </div>

          {/* Technicians */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-indigo-900">Technicians</h3>
              {technicians.length < 3 && (
                <button
                  type="button"
                  onClick={addTechnician}
                  className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1"
                  title="Add technician"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Add</span>
                </button>
              )}
            </div>
            <div className="space-y-3">
              {technicians.map((technician, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-gray-700 mb-2">
                      Technician {index + 1}
                    </label>
                    <input
                      type="text"
                      value={technician}
                      onChange={(e) => updateTechnician(index, e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Name"
                    />
                  </div>
                  {technicians.length > 1 && (
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeTechnician(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors mb-2"
                        title="Remove technician"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-indigo-900 mb-4">Remarks</h3>
            <div>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Additional notes or observations..."
              />
            </div>
          </div>

          {/* Channel Readings Summary */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg border border-indigo-200">
            <h3 className="text-indigo-900 mb-4">📊 Calculated Average O2 % Channel Readings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-gray-700 mb-2">Channel A</p>
                <p className="text-gray-600">Before: <span className="text-indigo-900">{calculateChannelReadings().channelABefore.toFixed(2)}%</span></p>
                <p className="text-gray-600">After: <span className="text-indigo-900">{calculateChannelReadings().channelAAfter.toFixed(2)}%</span></p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-gray-700 mb-2">Channel B</p>
                <p className="text-gray-600">Before: <span className="text-indigo-900">{calculateChannelReadings().channelBBefore.toFixed(2)}%</span></p>
                <p className="text-gray-600">After: <span className="text-indigo-900">{calculateChannelReadings().channelBAfter.toFixed(2)}%</span></p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-gray-700 mb-2">Channel C</p>
                <p className="text-gray-600">Before: <span className="text-indigo-900">{calculateChannelReadings().channelCBefore.toFixed(2)}%</span></p>
                <p className="text-gray-600">After: <span className="text-indigo-900">{calculateChannelReadings().channelCAfter.toFixed(2)}%</span></p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Navigation and Action Buttons */}
      <div className="flex gap-2 md:gap-4 justify-between">
        <button
          type="button"
          onClick={handleCancel}
          className="px-3 py-2 md:px-6 md:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-1 md:gap-2 text-sm md:text-base"
        >
          {editingSession ? <X className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4" />}
          <span className="hidden sm:inline">{editingSession ? 'Cancel' : 'Reset All'}</span>
          <span className="sm:hidden">{editingSession ? 'Cancel' : 'Reset'}</span>
        </button>

        <div className="flex gap-2 md:gap-4">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handlePrevious}
              className="px-3 py-2 md:px-6 md:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-1 md:gap-2 text-sm md:text-base"
            >
              <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </button>
          )}

          {!isLastStep ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-3 py-2 md:px-6 md:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1 md:gap-2 text-sm md:text-base"
            >
              <span className="hidden sm:inline">Next</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          ) : (
            <button
              type="submit"
              className="px-3 py-2 md:px-6 md:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 md:gap-2 text-sm md:text-base"
            >
              <Save className="w-3.5 h-3.5 md:w-4 md:h-4" />
              {editingSession ? 'Update Session' : 'Save Session'}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}