import React, { useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import { api } from '../lib/api';
import BreaksManager from './BreaksManager';

interface Worker {
    id: number;
    email: string;
    role: string;
    canServe?: boolean;
    isTrainee?: boolean;
}

interface Shift {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    workerId: number;
    workerEmail: string;
}

interface WeeklyScheduleProps {
    companyId: number;
}

export default function WeeklySchedule({ companyId }: WeeklyScheduleProps) {
    const [currentWeekStart, setCurrentWeekStart] = useState(DateTime.now().startOf('week'));
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalData, setModalData] = useState<{
        selectedWorkerIds: number[];
        date: string;
        startTime: string;
        endTime: string;
    } | null>(null);
    const [showBreaksManager, setShowBreaksManager] = useState(false);
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
    const [breaks, setBreaks] = useState<{ [shiftId: number]: Array<{ id: number; startTime: string; endTime: string }> }>({});

    useEffect(() => {
        loadData();
    }, [companyId, currentWeekStart]);

    const loadData = async () => {
        try {
            setLoading(true);
            const startDate = currentWeekStart.toISODate();
            const endDate = currentWeekStart.plus({ days: 6 }).toISODate();

            const [workersRes, shiftsRes] = await Promise.all([
                api<{ workers: Worker[] }>(`/companies/${companyId}/workers`),
                api<{ shifts: Shift[] }>(`/services/companies/${companyId}/shifts?startDate=${startDate}&endDate=${endDate}`)
            ]);
            setWorkers(workersRes.workers || []);
            setShifts(shiftsRes.shifts || []);
        } catch (error) {
            console.error('Failed to load schedule data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDaysInWeek = () => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            days.push(currentWeekStart.plus({ days: i }));
        }
        return days;
    };

    const getShiftsForCell = (workerId: number, date: string) => {
        return shifts.filter(s => s.workerId === workerId && s.date === date);
    };

    const handleCellClick = (workerId: number, date: string) => {
        setModalData({
            selectedWorkerIds: [workerId],
            date,
            startTime: '09:00',
            endTime: '17:00'
        });
        setShowModal(true);
    };

    const handleBulkEdit = (date: string) => {
        setModalData({
            selectedWorkerIds: workers.map(w => w.id),
            date,
            startTime: '09:00',
            endTime: '17:00'
        });
        setShowModal(true);
    };

    const handleSaveShift = async () => {
        if (!modalData || modalData.selectedWorkerIds.length === 0) return;

        try {
            const promises = modalData.selectedWorkerIds.map(workerId =>
                api(`/services/companies/${companyId}/workers/${workerId}/shifts`, {
                    method: 'POST',
                    body: JSON.stringify({
                        date: modalData.date,
                        startTime: modalData.startTime,
                        endTime: modalData.endTime
                    })
                }).catch(e => console.error(`Failed for worker ${workerId}`, e))
            );

            await Promise.all(promises);

            setShowModal(false);
            loadData();
        } catch (error) {
            console.error('Failed to save shift:', error);
            alert('Nie udało się zapisać zmiany');
        }
    };

    const handleDeleteShift = async (e: React.MouseEvent, shiftId: number) => {
        e.stopPropagation();
        if (!confirm('Czy na pewno chcesz usunąć tę zmianę?')) return;

        try {
            await api(`/shifts/${shiftId}`, { method: 'DELETE' });
            loadData();
        } catch (error) {
            console.error('Failed to delete shift:', error);
        }
    };

    const toggleWorkerSelection = (workerId: number) => {
        if (!modalData) return;
        const isSelected = modalData.selectedWorkerIds.includes(workerId);
        if (isSelected) {
            setModalData({
                ...modalData,
                selectedWorkerIds: modalData.selectedWorkerIds.filter(id => id !== workerId)
            });
        } else {
            setModalData({
                ...modalData,
                selectedWorkerIds: [...modalData.selectedWorkerIds, workerId]
            });
        }
    };

    const handleManageBreaks = (e: React.MouseEvent, shift: Shift) => {
        e.stopPropagation();
        setSelectedShift(shift);
        setShowBreaksManager(true);
    };

    const weekDays = getDaysInWeek();

    if (loading) return <div className="p-8 text-center">Ładowanie grafiku...</div>;

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setCurrentWeekStart(currentWeekStart.minus({ weeks: 1 }))}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        ←
                    </button>
                    <h2 className="text-lg font-semibold text-gray-900">
                        {currentWeekStart.toFormat('d MMM')} - {currentWeekStart.plus({ days: 6 }).toFormat('d MMM yyyy')}
                    </h2>
                    <button
                        onClick={() => setCurrentWeekStart(currentWeekStart.plus({ weeks: 1 }))}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        →
                    </button>
                </div>
                <button
                    onClick={() => setCurrentWeekStart(DateTime.now().startOf('week'))}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                    Wróć do dzisiaj
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48 sticky left-0 bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                Pracownik
                            </th>
                            {weekDays.map(day => (
                                <th key={day.toISODate()} className={`px-3 py-3 text-center min-w-[140px] group relative ${day.hasSame(DateTime.now(), 'day') ? 'bg-blue-50' : ''
                                    }`}>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                        {day.toFormat('EEEE')}
                                    </div>
                                    <div className={`text-lg font-bold ${day.hasSame(DateTime.now(), 'day') ? 'text-blue-700' : 'text-gray-900'
                                        }`}>
                                        {day.toFormat('d.MM')}
                                    </div>

                                    {/* Bulk Edit Button */}
                                    <button
                                        onClick={() => handleBulkEdit(day.toISODate())}
                                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 px-2 py-1 rounded border border-blue-200"
                                    >
                                        Dodaj dla wielu
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {workers.map(worker => (
                            <tr key={worker.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    <div className="flex flex-col">
                                        <span>{worker.email}</span>
                                        <span className="text-xs text-gray-500 font-normal">
                                            {worker.role === 'OWNER' ? 'Właściciel' : 'Pracownik'}
                                            {worker.isTrainee && ' (Stażysta)'}
                                        </span>
                                    </div>
                                </td>
                                {weekDays.map(day => {
                                    const dateStr = day.toFormat('yyyy-MM-dd');
                                    const cellShifts = getShiftsForCell(worker.id, dateStr);
                                    const isToday = day.hasSame(DateTime.now(), 'day');

                                    return (
                                        <td
                                            key={dateStr}
                                            className={`px-2 py-2 border-r border-gray-100 align-top h-24 cursor-pointer transition-colors hover:bg-gray-50 ${isToday ? 'bg-blue-50/30' : ''
                                                }`}
                                            onClick={() => handleCellClick(worker.id, dateStr)}
                                        >
                                            <div className="space-y-1 min-h-full flex flex-col">
                                                {cellShifts.length === 0 && (
                                                    <div className="flex-1 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-blue-100 hover:text-blue-600">
                                                            +
                                                        </div>
                                                    </div>
                                                )}
                                                {cellShifts.map(shift => (
                                                    <div
                                                        key={shift.id}
                                                        className="group relative bg-blue-100 text-blue-800 text-xs p-2 rounded border border-blue-200 hover:bg-blue-200 transition-colors shadow-sm"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="font-semibold text-center flex items-center justify-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            {shift.startTime} - {shift.endTime}
                                                        </div>
                                                        <button
                                                            onClick={(e) => handleManageBreaks(e, shift)}
                                                            className="mt-1 text-purple-600 hover:text-purple-800 text-xxs flex items-center justify-center gap-1 w-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Manage breaks"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            Breaks
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDeleteShift(e, shift.id)}
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md hover:bg-red-600 transform scale-90 hover:scale-100"
                                                            title="Usuń zmianę"
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                ))}

                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Shift Modal */}
            {showModal && modalData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 shadow-xl transform transition-all scale-100">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Dodaj zmianę
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700">Dla kogo</label>
                                    <div className="space-x-2 text-xs">
                                        <button
                                            onClick={() => setModalData({ ...modalData, selectedWorkerIds: workers.map(w => w.id) })}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            Wszyscy
                                        </button>
                                        <span className="text-gray-300">|</span>
                                        <button
                                            onClick={() => setModalData({ ...modalData, selectedWorkerIds: [] })}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            Nikt
                                        </button>
                                    </div>
                                </div>
                                <div className="max-h-48 overflow-y-auto border rounded-md p-2 bg-gray-50">
                                    {workers.map(worker => (
                                        <label key={worker.id} className="flex items-center space-x-2 p-1.5 hover:bg-white rounded cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={modalData.selectedWorkerIds.includes(worker.id)}
                                                onChange={() => toggleWorkerSelection(worker.id)}
                                                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-gray-300"
                                            />
                                            <span className="text-sm text-gray-700 select-none">{worker.email}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Wybrano: {modalData.selectedWorkerIds.length} prac.
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Data</label>
                                <div className="mt-1 p-2 bg-gray-100 rounded text-gray-700">
                                    {DateTime.fromISO(modalData.date).toFormat('dd MMMM yyyy (EEEE)')}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Od</label>
                                    <input
                                        type="time"
                                        value={modalData.startTime}
                                        onChange={e => setModalData({ ...modalData, startTime: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Do</label>
                                    <input
                                        type="time"
                                        value={modalData.endTime}
                                        onChange={e => setModalData({ ...modalData, endTime: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={handleSaveShift}
                                disabled={modalData.selectedWorkerIds.length === 0}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Zapisz ({modalData.selectedWorkerIds.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Breaks Manager Modal */}
            {showBreaksManager && selectedShift && (
                <BreaksManager
                    shiftId={selectedShift.id}
                    shiftDate={selectedShift.date}
                    shiftStart={selectedShift.startTime}
                    shiftEnd={selectedShift.endTime}
                    onClose={() => {
                        setShowBreaksManager(false);
                        setSelectedShift(null);
                    }}
                    onUpdate={() => {
                        loadData(); // Reload shifts to reflect break changes
                    }}
                />
            )}
        </div>
    );
}

