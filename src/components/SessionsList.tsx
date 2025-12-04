import { CalibrationSession } from '../App';
import { Trash2, FileText, Download, Filter, FileDown, ChevronDown, ChevronUp, Edit } from 'lucide-react';
import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner@2.0.3';
import logo from 'figma:asset/bbe538ebbc683fd4468cd8b0dad80b71648785ad.png';

interface SessionsListProps {
  sessions: CalibrationSession[];
  onDelete: (id: string) => void;
  onEdit: (session: CalibrationSession) => void;
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

export function SessionsList({ sessions, onDelete, onEdit }: SessionsListProps) {
  const [filterPlantItem, setFilterPlantItem] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter sessions based on filters and sort by date (newest first)
  const filteredSessions = sessions
    .filter((session) => {
      // Plant item filter - check if any plant item in the session matches
      const matchesPlantItem = filterPlantItem === '' || 
        session.plantItems.some(item => item.plantItem === filterPlantItem);

      // Date range filter
      const sessionDate = new Date(session.timestamp);
      const matchesStartDate = startDate === '' || sessionDate >= new Date(startDate);
      const matchesEndDate = endDate === '' || sessionDate <= new Date(endDate + 'T23:59:59');

      return matchesPlantItem && matchesStartDate && matchesEndDate;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const clearFilters = () => {
    setFilterPlantItem('');
    setStartDate('');
    setEndDate('');
  };

  const toggleSession = (id: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSessions(newExpanded);
  };

  const handleDelete = (session: CalibrationSession) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete this calibration session?\n\nDate: ${formatDate(session.timestamp)}\nTechnician(s): ${[session.technician1, session.technician2, session.technician3].filter(Boolean).join(', ') || 'None'}\n\nThis action cannot be undone.`
    );
    
    if (confirmed) {
      onDelete(session.id);
      toast.success('Session deleted successfully');
    }
  };

  // Export single session to CSV
  const exportSessionToCSV = (session: CalibrationSession) => {
    const headers = [
      'Timestamp',
      'Plant Item',
      'O2 Before (%)',
      'O2 After (%)',
      'O2 Span (%)',
      'O2 Zero (%)',
      'Gas Ratio Span Before',
      'Gas Ratio Span After',
      'Gas Ratio Zero Before',
      'Gas Ratio Zero After',
      'Cell Temp (°C)',
      'Cell Lifetime (months)',
      'Cell Voltage (mV)',
      'Cell Resistance (Ω)',
      'Channel A Before (%)',
      'Channel A After (%)',
      'Channel B Before (%)',
      'Channel B After (%)',
      'Channel C Before (%)',
      'Channel C After (%)',
      'Bottle Pressure Span (psi)',
      'Bottle Pressure Zero (psi)',
      'Regulator Pressure Span (psi)',
      'Regulator Pressure Zero (psi)',
      'Technician 1',
      'Technician 2',
      'Technician 3',
      'Remarks',
    ];

    const csvRows: string[] = [headers.join(',')];

    // Add channel readings row first
    csvRows.push([
      formatDate(session.timestamp),
      'CHANNEL AVERAGES',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      session.channelReadings.channelABefore.toFixed(2),
      session.channelReadings.channelAAfter.toFixed(2),
      session.channelReadings.channelBBefore.toFixed(2),
      session.channelReadings.channelBAfter.toFixed(2),
      session.channelReadings.channelCBefore.toFixed(2),
      session.channelReadings.channelCAfter.toFixed(2),
      session.calGasBottlePressureSpan,
      session.calGasBottlePressureZero,
      session.calGasRegulatorPressureSpan,
      session.calGasRegulatorPressureZero,
      session.technician1,
      session.technician2,
      session.technician3,
      `"${session.remarks.replace(/"/g, '""')}"`,
    ].join(','));

    // Add each plant item row
    session.plantItems.forEach(item => {
      csvRows.push([
        formatDate(session.timestamp),
        item.plantItem,
        item.o2BeforeCalibration,
        item.o2AfterCalibration,
        item.calibrationO2Span,
        item.calibrationO2Zero,
        item.gasRatioSpanBefore,
        item.gasRatioSpanAfter,
        item.gasRatioZeroBefore,
        item.gasRatioZeroAfter,
        item.cellTemperature,
        item.cellLifetime,
        item.cellVoltage,
        item.cellResistance,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ].join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const filename = `calibration_session_${session.id}.csv`;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success notification
    toast.success('CSV exported successfully!', {
      description: `File: ${filename}`
    });
  };

  // Export single session to PDF
  const exportSessionToPDF = (session: CalibrationSession) => {
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      
      // Use the same forEach structure as bulk export, just with one session
      const sessionsArray = [session];
      
      sessionsArray.forEach((session, sessionIndex) => {
        if (sessionIndex > 0) {
          doc.addPage();
        }

        const pageWidth = doc.internal.pageSize.getWidth();

        // Add logo with error handling
        try {
          const img = new Image();
          img.src = logo;
          doc.addImage(img, 'PNG', 14, 8, 40, 15);
        } catch (error) {
          console.error('Error loading logo:', error);
          // Continue without logo
        }
        
        // Add title
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Unit 7 O2 AH Inlet Analyzers Weekly Preventive Maintenance', pageWidth / 2, 15, { align: 'center' });
        
        // Add session info
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`Date: ${formatDate(session.timestamp)}`, 14, 28);
        doc.text(`Technicians: ${[session.technician1, session.technician2, session.technician3].filter(Boolean).join(', ') || 'N/A'}`, 14, 33);

        let startY = 38;

        // Plant items table FIRST (blue header)
        const plantColumns = [
          { header: 'Plant Item', dataKey: 'plantItem' },
          { header: 'O2 Before (%)', dataKey: 'o2Before' },
          { header: 'O2 After (%)', dataKey: 'o2After' },
          { header: 'O2 Span (%)', dataKey: 'o2Span' },
          { header: 'O2 Zero (%)', dataKey: 'o2Zero' },
          { header: 'Gas Ratio Span Before (%)', dataKey: 'gasSpanBefore' },
          { header: 'Gas Ratio Span After (%)', dataKey: 'gasSpanAfter' },
          { header: 'Gas Ratio Zero Before (%)', dataKey: 'gasZeroBefore' },
          { header: 'Gas Ratio Zero After (%)', dataKey: 'gasZeroAfter' },
          { header: 'Cell Temp (°C)', dataKey: 'cellTemp' },
          { header: 'Cell Life (mo)', dataKey: 'cellLife' },
          { header: 'Cell Volt (mV)', dataKey: 'cellVolt' },
          { header: 'Cell Res (ohm)', dataKey: 'cellRes' },
        ];

        const plantTableData = session.plantItems.map(item => ({
          plantItem: item.plantItem,
          o2Before: item.o2BeforeCalibration || '-',
          o2After: item.o2AfterCalibration || '-',
          o2Span: item.calibrationO2Span || '-',
          o2Zero: item.calibrationO2Zero || '-',
          gasSpanBefore: item.gasRatioSpanBefore || '-',
          gasSpanAfter: item.gasRatioSpanAfter || '-',
          gasZeroBefore: item.gasRatioZeroBefore || '-',
          gasZeroAfter: item.gasRatioZeroAfter || '-',
          cellTemp: item.cellTemperature || '-',
          cellLife: item.cellLifetime || '-',
          cellVolt: item.cellVoltage || '-',
          cellRes: item.cellResistance || '-',
        }));

        autoTable(doc, {
          columns: plantColumns,
          body: plantTableData,
          startY: startY,
          styles: { 
            fontSize: 7,
            cellPadding: 1.5,
            halign: 'center',
          },
          headStyles: {
            fillColor: [59, 130, 246], // Blue color
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'center',
          },
          alternateRowStyles: {
            fillColor: [245, 247, 250],
          },
          margin: { left: 14, right: 14 },
        });

        // Update startY after plant items table
        startY = (doc as any).lastAutoTable.finalY + 10;

        // Channel readings and Cal Gas Pressure side by side BELOW plant items table
        const channelData = [
          ['Channel A (Before)', session.channelReadings.channelABefore.toFixed(2) + '%'],
          ['Channel A (After)', session.channelReadings.channelAAfter.toFixed(2) + '%'],
          ['Channel B (Before)', session.channelReadings.channelBBefore.toFixed(2) + '%'],
          ['Channel B (After)', session.channelReadings.channelBAfter.toFixed(2) + '%'],
          ['Channel C (Before)', session.channelReadings.channelCBefore.toFixed(2) + '%'],
          ['Channel C (After)', session.channelReadings.channelCAfter.toFixed(2) + '%'],
        ];

        const gasData = [
          ['Bottle Pressure Span', (session.calGasBottlePressureSpan || '-') + ' psi'],
          ['Bottle Pressure Zero', (session.calGasBottlePressureZero || '-') + ' psi'],
          ['Regulator Pressure Span', (session.calGasRegulatorPressureSpan || '-') + ' psi'],
          ['Regulator Pressure Zero', (session.calGasRegulatorPressureZero || '-') + ' psi'],
        ];

        // Channel readings on the left
        autoTable(doc, {
          head: [['Average O2 Channel Readings', 'Value']],
          body: channelData,
          startY: startY,
          theme: 'grid',
          headStyles: {
            fillColor: [34, 197, 94], // Green color
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 10,
          },
          styles: {
            fontSize: 9,
          },
          margin: { left: 14 },
          tableWidth: 90,
        });

        // Cal Gas Pressure on the right
        autoTable(doc, {
          head: [['Cal Gas Pressure Readings', 'Value']],
          body: gasData,
          startY: startY,
          theme: 'grid',
          headStyles: {
            fillColor: [34, 197, 94], // Green color
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 10,
          },
          styles: {
            fontSize: 9,
          },
          margin: { left: 110 },
          tableWidth: 90,
        });

        // Add remarks if exists
        if (session.remarks) {
          const remarksY = (doc as any).lastAutoTable.finalY + 8;
          doc.setFontSize(9);
          doc.setFont(undefined, 'bold');
          doc.text('Remarks:', 14, remarksY);
          doc.setFont(undefined, 'normal');
          const splitRemarks = doc.splitTextToSize(session.remarks, pageWidth - 28);
          doc.text(splitRemarks, 14, remarksY + 5);
        }

        // Add page number
        doc.setFontSize(8);
        doc.text(
          `Session ${sessionIndex + 1} of ${sessionsArray.length}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      });

      const filename = `calibration_session_${session.id}.pdf`;
      
      // Use the exact same save method as bulk export (which works on Android)
      doc.save(filename);
      
      // Show success notification
      toast.success('PDF exported successfully!', {
        description: `File: ${filename}`
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to export PDF', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  const exportToCSV = () => {
    if (filteredSessions.length === 0) return;

    const headers = [
      'Timestamp',
      'Plant Item',
      'O2 Before (%)',
      'O2 After (%)',
      'O2 Span (%)',
      'O2 Zero (%)',
      'Gas Ratio Span Before',
      'Gas Ratio Span After',
      'Gas Ratio Zero Before',
      'Gas Ratio Zero After',
      'Cell Temp (°C)',
      'Cell Lifetime (months)',
      'Cell Voltage (mV)',
      'Cell Resistance (Ω)',
      'Channel A Before (%)',
      'Channel A After (%)',
      'Channel B Before (%)',
      'Channel B After (%)',
      'Channel C Before (%)',
      'Channel C After (%)',
      'Bottle Pressure Span (psi)',
      'Bottle Pressure Zero (psi)',
      'Regulator Pressure Span (psi)',
      'Regulator Pressure Zero (psi)',
      'Technician 1',
      'Technician 2',
      'Technician 3',
      'Remarks',
    ];

    const csvRows: string[] = [headers.join(',')];

    filteredSessions.forEach(session => {
      // Add channel readings row first
      csvRows.push([
        formatDate(session.timestamp),
        'CHANNEL AVERAGES',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        session.channelReadings.channelABefore.toFixed(2),
        session.channelReadings.channelAAfter.toFixed(2),
        session.channelReadings.channelBBefore.toFixed(2),
        session.channelReadings.channelBAfter.toFixed(2),
        session.channelReadings.channelCBefore.toFixed(2),
        session.channelReadings.channelCAfter.toFixed(2),
        session.calGasBottlePressureSpan,
        session.calGasBottlePressureZero,
        session.calGasRegulatorPressureSpan,
        session.calGasRegulatorPressureZero,
        session.technician1,
        session.technician2,
        session.technician3,
        `"${session.remarks.replace(/"/g, '""')}"`,
      ].join(','));

      // Add each plant item row
      session.plantItems.forEach(item => {
        csvRows.push([
          formatDate(session.timestamp),
          item.plantItem,
          item.o2BeforeCalibration,
          item.o2AfterCalibration,
          item.calibrationO2Span,
          item.calibrationO2Zero,
          item.gasRatioSpanBefore,
          item.gasRatioSpanAfter,
          item.gasRatioZeroBefore,
          item.gasRatioZeroAfter,
          item.cellTemperature,
          item.cellLifetime,
          item.cellVoltage,
          item.cellResistance,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ].join(','));
      });
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const filename = `calibration_sessions_${Date.now()}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success notification
    toast.success('CSV exported successfully!', {
      description: `${filteredSessions.length} session(s) exported`
    });
  };

  const exportToPDF = () => {
    if (filteredSessions.length === 0) return;

    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    filteredSessions.forEach((session, sessionIndex) => {
      if (sessionIndex > 0) {
        doc.addPage();
      }

      const pageWidth = doc.internal.pageSize.getWidth();

      // Add logo with error handling
      try {
        const img = new Image();
        img.src = logo;
        doc.addImage(img, 'PNG', 14, 8, 40, 15);
      } catch (error) {
        console.error('Error loading logo:', error);
        // Continue without logo
      }
      
      // Add title
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Unit 7 O2 AH Inlet Analyzers Weekly Preventive Maintenance', pageWidth / 2, 15, { align: 'center' });
      
      // Add session info
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(`Date: ${formatDate(session.timestamp)}`, 14, 28);
      doc.text(`Technicians: ${[session.technician1, session.technician2, session.technician3].filter(Boolean).join(', ') || 'N/A'}`, 14, 33);

      let startY = 38;

      // Plant items table FIRST (blue header)
      const plantColumns = [
        { header: 'Plant Item', dataKey: 'plantItem' },
        { header: 'O2 Before (%)', dataKey: 'o2Before' },
        { header: 'O2 After (%)', dataKey: 'o2After' },
        { header: 'O2 Span (%)', dataKey: 'o2Span' },
        { header: 'O2 Zero (%)', dataKey: 'o2Zero' },
        { header: 'Gas Ratio Span Before (%)', dataKey: 'gasSpanBefore' },
        { header: 'Gas Ratio Span After (%)', dataKey: 'gasSpanAfter' },
        { header: 'Gas Ratio Zero Before (%)', dataKey: 'gasZeroBefore' },
        { header: 'Gas Ratio Zero After (%)', dataKey: 'gasZeroAfter' },
        { header: 'Cell Temp (°C)', dataKey: 'cellTemp' },
        { header: 'Cell Life (mo)', dataKey: 'cellLife' },
        { header: 'Cell Volt (mV)', dataKey: 'cellVolt' },
        { header: 'Cell Res (ohm)', dataKey: 'cellRes' },
      ];

      const plantTableData = session.plantItems.map(item => ({
        plantItem: item.plantItem,
        o2Before: item.o2BeforeCalibration || '-',
        o2After: item.o2AfterCalibration || '-',
        o2Span: item.calibrationO2Span || '-',
        o2Zero: item.calibrationO2Zero || '-',
        gasSpanBefore: item.gasRatioSpanBefore || '-',
        gasSpanAfter: item.gasRatioSpanAfter || '-',
        gasZeroBefore: item.gasRatioZeroBefore || '-',
        gasZeroAfter: item.gasRatioZeroAfter || '-',
        cellTemp: item.cellTemperature || '-',
        cellLife: item.cellLifetime || '-',
        cellVolt: item.cellVoltage || '-',
        cellRes: item.cellResistance || '-',
      }));

      autoTable(doc, {
        columns: plantColumns,
        body: plantTableData,
        startY: startY,
        styles: { 
          fontSize: 7,
          cellPadding: 1.5,
          halign: 'center',
        },
        headStyles: {
          fillColor: [59, 130, 246], // Blue color
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        margin: { left: 14, right: 14 },
      });

      // Update startY after plant items table
      startY = (doc as any).lastAutoTable.finalY + 10;

      // Channel readings and Cal Gas Pressure side by side BELOW plant items table
      const channelData = [
        ['Channel A (Before)', session.channelReadings.channelABefore.toFixed(2) + '%'],
        ['Channel A (After)', session.channelReadings.channelAAfter.toFixed(2) + '%'],
        ['Channel B (Before)', session.channelReadings.channelBBefore.toFixed(2) + '%'],
        ['Channel B (After)', session.channelReadings.channelBAfter.toFixed(2) + '%'],
        ['Channel C (Before)', session.channelReadings.channelCBefore.toFixed(2) + '%'],
        ['Channel C (After)', session.channelReadings.channelCAfter.toFixed(2) + '%'],
      ];

      const gasData = [
        ['Bottle Pressure Span', (session.calGasBottlePressureSpan || '-') + ' psi'],
        ['Bottle Pressure Zero', (session.calGasBottlePressureZero || '-') + ' psi'],
        ['Regulator Pressure Span', (session.calGasRegulatorPressureSpan || '-') + ' psi'],
        ['Regulator Pressure Zero', (session.calGasRegulatorPressureZero || '-') + ' psi'],
      ];

      // Channel readings on the left
      autoTable(doc, {
        head: [['Average O2 Channel Readings', 'Value']],
        body: channelData,
        startY: startY,
        theme: 'grid',
        headStyles: {
          fillColor: [34, 197, 94], // Green color
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 10,
        },
        styles: {
          fontSize: 9,
        },
        margin: { left: 14 },
        tableWidth: 90,
      });

      // Cal Gas Pressure on the right
      autoTable(doc, {
        head: [['Cal Gas Pressure Readings', 'Value']],
        body: gasData,
        startY: startY,
        theme: 'grid',
        headStyles: {
          fillColor: [34, 197, 94], // Green color
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 10,
        },
        styles: {
          fontSize: 9,
        },
        margin: { left: 110 },
        tableWidth: 90,
      });

      // Add remarks if exists
      if (session.remarks) {
        const remarksY = (doc as any).lastAutoTable.finalY + 8;
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('Remarks:', 14, remarksY);
        doc.setFont(undefined, 'normal');
        const splitRemarks = doc.splitTextToSize(session.remarks, pageWidth - 28);
        doc.text(splitRemarks, 14, remarksY + 5);
      }

      // Add page number
      doc.setFontSize(8);
      doc.text(
        `Session ${sessionIndex + 1} of ${filteredSessions.length}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    });

    doc.save(`calibration_sessions_${Date.now()}.pdf`);
    
    // Show success notification
    toast.success('PDF exported successfully!', {
      description: `Exported ${filteredSessions.length} session(s)`
    });
  };

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No sessions yet. Create your first calibration session.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Section */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-indigo-600" />
          <h3 className="text-indigo-900">Filters</h3>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">Plant Item</label>
            <select
              value={filterPlantItem}
              onChange={(e) => setFilterPlantItem(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Plant Items</option>
              {plantItems.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Active Filters Summary and Clear Button */}
        {(filterPlantItem || startDate || endDate) && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <p className="text-gray-600">
              Showing {filteredSessions.length} of {sessions.length} sessions
            </p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <p className="text-gray-600 text-sm md:text-base">
          {filteredSessions.length === sessions.length 
            ? `Total Sessions: ${sessions.length}` 
            : `Showing ${filteredSessions.length} of ${sessions.length} sessions`}
        </p>
        <div className="flex gap-2">
          <button
            onClick={exportToPDF}
            className="px-2 py-1.5 md:px-4 md:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1 md:gap-2 text-sm md:text-base"
          >
            <FileDown className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Export to PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
          <button
            onClick={exportToCSV}
            className="px-2 py-1.5 md:px-4 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 md:gap-2 text-sm md:text-base"
          >
            <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Export to CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No sessions match your search criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => {
            const isExpanded = expandedSessions.has(session.id);
            // Filter plant items if a specific plant item is selected
            const displayPlantItems = filterPlantItem 
              ? session.plantItems.filter(item => item.plantItem === filterPlantItem)
              : session.plantItems;
            
            return (
              <div key={session.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {/* Session Header */}
                <div className="p-6 bg-gradient-to-r from-indigo-50 to-blue-50">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-indigo-900 mb-1">
                        Calibration Session
                        {filterPlantItem && <span className="text-indigo-600 ml-2">({filterPlantItem})</span>}
                      </h3>
                      <p className="text-gray-600">{formatDate(session.timestamp)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleSession(session.id)}
                        className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                        title={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => exportSessionToPDF(session)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Export to PDF"
                      >
                        <FileDown className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => exportSessionToCSV(session)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Export to CSV"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onEdit(session)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit session"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(session)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete session"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Channel Readings - Always Visible (Full Session Data) */}
                  {!filterPlantItem && (
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <h4 className="text-gray-900 mb-3">Average O2 % Channel Readings</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-gray-700 mb-2">Channel A</p>
                          <div className="space-y-1">
                            <p className="text-gray-600">
                              <span className="inline-block w-14">Before:</span>
                              <span className="text-gray-900">{session.channelReadings.channelABefore.toFixed(2)}%</span>
                            </p>
                            <p className="text-gray-600">
                              <span className="inline-block w-14">After:</span>
                              <span className="text-gray-900">{session.channelReadings.channelAAfter.toFixed(2)}%</span>
                            </p>
                          </div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-gray-700 mb-2">Channel B</p>
                          <div className="space-y-1">
                            <p className="text-gray-600">
                              <span className="inline-block w-14">Before:</span>
                              <span className="text-gray-900">{session.channelReadings.channelBBefore.toFixed(2)}%</span>
                            </p>
                            <p className="text-gray-600">
                              <span className="inline-block w-14">After:</span>
                              <span className="text-gray-900">{session.channelReadings.channelBAfter.toFixed(2)}%</span>
                            </p>
                          </div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <p className="text-gray-700 mb-2">Channel C</p>
                          <div className="space-y-1">
                            <p className="text-gray-600">
                              <span className="inline-block w-14">Before:</span>
                              <span className="text-gray-900">{session.channelReadings.channelCBefore.toFixed(2)}%</span>
                            </p>
                            <p className="text-gray-600">
                              <span className="inline-block w-14">After:</span>
                              <span className="text-gray-900">{session.channelReadings.channelCAfter.toFixed(2)}%</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Plant Item Summary when filtered */}
                  {filterPlantItem && displayPlantItems.length > 0 && (
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <h4 className="text-gray-900 mb-3">{filterPlantItem} - Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-gray-700">O2 Before</p>
                          <p className="text-gray-900">{displayPlantItems[0].o2BeforeCalibration || '-'}%</p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-gray-700">O2 After</p>
                          <p className="text-gray-900">{displayPlantItems[0].o2AfterCalibration || '-'}%</p>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <p className="text-gray-700">Cell Temp</p>
                          <p className="text-gray-900">{displayPlantItems[0].cellTemperature || '-'}°C</p>
                        </div>
                        <div className="bg-amber-50 p-3 rounded-lg">
                          <p className="text-gray-700">Cell Lifetime</p>
                          <p className="text-gray-900">{displayPlantItems[0].cellLifetime || '-'} mo</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Technicians and Remarks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-700 mb-1">Technicians</p>
                      <div className="space-y-1">
                        {session.technician1 && <p className="text-gray-900">• {session.technician1}</p>}
                        {session.technician2 && <p className="text-gray-900">• {session.technician2}</p>}
                        {session.technician3 && <p className="text-gray-900">• {session.technician3}</p>}
                        {!session.technician1 && !session.technician2 && !session.technician3 && (
                          <p className="text-gray-600">-</p>
                        )}
                      </div>
                    </div>
                    {session.remarks && (
                      <div>
                        <p className="text-gray-700 mb-1">Remarks</p>
                        <p className="text-gray-600">{session.remarks}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expandable Plant Items Details */}
                {isExpanded && (
                  <div className="p-6 bg-gray-50">
                    <h4 className="text-gray-900 mb-4">
                      {filterPlantItem ? `${filterPlantItem} - Detailed Information` : 'Plant Items Details'}
                    </h4>
                    <div className="space-y-4">
                      {displayPlantItems.map((item, index) => (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                          <h5 className="text-indigo-900 mb-3">{item.plantItem}</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-700 mb-1">O2 Measurements</p>
                              <p className="text-gray-600">Before: {item.o2BeforeCalibration || '-'}%</p>
                              <p className="text-gray-600">After: {item.o2AfterCalibration || '-'}%</p>
                              <p className="text-gray-600">Span: {item.calibrationO2Span || '-'}%</p>
                              <p className="text-gray-600">Zero: {item.calibrationO2Zero || '-'}%</p>
                            </div>
                            <div>
                              <p className="text-gray-700 mb-1">Gas Ratios</p>
                              <p className="text-gray-600">Span Before: {item.gasRatioSpanBefore || '-'}</p>
                              <p className="text-gray-600">Span After: {item.gasRatioSpanAfter || '-'}</p>
                              <p className="text-gray-600">Zero Before: {item.gasRatioZeroBefore || '-'}</p>
                              <p className="text-gray-600">Zero After: {item.gasRatioZeroAfter || '-'}</p>
                            </div>
                            <div>
                              <p className="text-gray-700 mb-1">Cell Measurements</p>
                              <p className="text-gray-600">Temp: {item.cellTemperature || '-'}°C</p>
                              <p className="text-gray-600">Lifetime: {item.cellLifetime || '-'} mo</p>
                              <p className="text-gray-600">Voltage: {item.cellVoltage || '-'} mV</p>
                              <p className="text-gray-600">Resistance: {item.cellResistance || '-'} Ω</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}