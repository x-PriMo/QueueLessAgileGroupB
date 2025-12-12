super import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Break {
    id: number;
    shiftId: number;
    startTime: string;
    endTime: string;
}

interface BreaksManagerProps {
    shiftId: number;
    shiftDate: string;
    shiftStart: string;
    shiftEnd: string;
    onClose: () => void;
    onUpdate: () => void;
}

export default function BreaksManager({ shiftId, shiftDate, shiftStart, shiftEnd, onClose, onUpdate }: BreaksManagerProps) {
    const [breaks, setBreaks] = useState<Break[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [newBreakStart, setNewBreakStart] = useState('');
    const [newBreakDuration, setNewBreakDuration] = useState(15);
    const [editingBreak, setEditingBreak] = useState<number | null>(null);

    useEffect(() => {
        loadBreaks();
    }, [shiftId]);

    const loadBreaks = async () => {
        try {
            setLoading(true);
            const response = await api<{ breaks: Break[] }>(`/worker/breaks?shiftId=${shiftId}`);
            setBreaks(response.breaks || []);
        } catch (err) {
            console.error('Error loading breaks:', err);
            setError('Failed to load breaks');
        } finally {
            setLoading(false);
        }
    };

    const handleAddBreak = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!newBreakStart) {
            setError('Proszę wybrać godzinę rozpoczęcia');
            return;
        }

        // Calculate end time from start + duration
        const [hours, minutes] = newBreakStart.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + newBreakDuration;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        const calculatedEndTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

        try {
            await api('/worker/breaks', {
                method: 'POST',
                body: JSON.stringify({
                    shiftId,
                    startTime: newBreakStart,
                    endTime: calculatedEndTime
                })
            });

            setNewBreakStart('');
            setNewBreakDuration(15);
            await loadBreaks();
            onUpdate();
        } catch (err: any) {
            setError(err.message || 'Nie udało się dodać przerwy');
        }
    };

    const handleDeleteBreak = async (breakId: number) => {
        console.log('Delete break clicked:', breakId);

        if (!confirm('Czy na pewno chcesz usunąć tę przerwę?')) {
            console.log('User cancelled delete');
            return;
        }

        console.log('Sending DELETE request...');
        try {
            await api(`/worker/breaks/${breakId}`, { method: 'DELETE' });
            console.log('Delete successful, reloading breaks');
            await loadBreaks();
            onUpdate();
        } catch (err: any) {
            console.error('Delete break error:', err);
            setError(err.message || 'Nie udało się usunąć przerwy');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Manage Breaks</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Shift: {shiftDate} • {shiftStart} - {shiftEnd}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Add New Break Form */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">Add New Break</h3>
                        <form onSubmit={handleAddBreak} className="flex gap-3 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                <input
                                    type="time"
                                    value={newBreakStart}
                                    onChange={e => setNewBreakStart(e.target.value)}
                                    min={shiftStart}
                                    max={shiftEnd}
                                    required
                                    className="input-brand w-full"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Czas trwania: <span className="text-purple-600 font-semibold">{newBreakDuration} min</span>
                                </label>
                                <input
                                    type="range"
                                    min="5"
                                    max="60"
                                    step="5"
                                    value={newBreakDuration}
                                    onChange={e => setNewBreakDuration(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>5 min</span>
                                    <span>60 min</span>
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="btn-brand-primary px-4 py-2 whitespace-nowrap"
                            >
                                + Add Break
                            </button>
                        </form>
                    </div>

                    {/* Existing Breaks List */}
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Current Breaks</h3>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="brand-spinner"></div>
                            </div>
                        ) : breaks.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                                <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p>No breaks scheduled for this shift</p>
                                <p className="text-sm mt-1">Add one using the form above</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {breaks.map(breakItem => (
                                    <div
                                        key={breakItem.id}
                                        className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900">
                                                    {breakItem.startTime} - {breakItem.endTime}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    Duration: {calculateDuration(breakItem.startTime, breakItem.endTime)} min
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteBreak(breakItem.id)}
                                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                            title="Delete break"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Visual Timeline */}
                    {breaks.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Break Timeline</h4>
                            <div className="relative h-12 bg-white rounded border border-gray-200">
                                {/* Shift background */}
                                <div className="absolute inset-0 bg-blue-50 rounded"></div>

                                {/* Break markers */}
                                {breaks.map(breakItem => {
                                    const { left, width } = calculateBreakPosition(breakItem, shiftStart, shiftEnd);
                                    return (
                                        <div
                                            key={breakItem.id}
                                            className="absolute h-full bg-purple-400 border-2 border-purple-600 rounded"
                                            style={{ left: `${left}%`, width: `${width}%` }}
                                            title={`Break: ${breakItem.startTime} - ${breakItem.endTime}`}
                                        />
                                    );
                                })}

                                {/* Time labels */}
                                <div className="absolute -bottom-6 left-0 text-xs text-gray-500">{shiftStart}</div>
                                <div className="absolute -bottom-6 right-0 text-xs text-gray-500">{shiftEnd}</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="btn-brand-outline w-full"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper function to calculate duration in minutes
function calculateDuration(start: string, end: string): number {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
}

// Helper function to calculate break position on timeline
function calculateBreakPosition(breakItem: Break, shiftStart: string, shiftEnd: string): { left: number; width: number } {
    const [shiftStartH, shiftStartM] = shiftStart.split(':').map(Number);
    const [shiftEndH, shiftEndM] = shiftEnd.split(':').map(Number);
    const [breakStartH, breakStartM] = breakItem.startTime.split(':').map(Number);
    const [breakEndH, breakEndM] = breakItem.endTime.split(':').map(Number);

    const shiftStartMinutes = shiftStartH * 60 + shiftStartM;
    const shiftEndMinutes = shiftEndH * 60 + shiftEndM;
    const breakStartMinutes = breakStartH * 60 + breakStartM;
    const breakEndMinutes = breakEndH * 60 + breakEndM;

    const shiftDuration = shiftEndMinutes - shiftStartMinutes;
    const breakStart = breakStartMinutes - shiftStartMinutes;
    const breakDuration = breakEndMinutes - breakStartMinutes;

    return {
        left: (breakStart / shiftDuration) * 100,
        width: (breakDuration / shiftDuration) * 100
    };
}
