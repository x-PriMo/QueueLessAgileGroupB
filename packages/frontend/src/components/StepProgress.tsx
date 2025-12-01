import React from 'react';

interface StepProgressProps {
    currentStep: number;
    totalSteps?: number; // Optional, but good to have
}

// Custom SVG icons
const BuildingOffice2Icon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
);

const CreditCardIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
);

const CalendarIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

const steps = [
    { num: 1, label: 'Firma', icon: BuildingOffice2Icon },
    { num: 2, label: 'Usługa', icon: CreditCardIcon },
    { num: 3, label: 'Data', icon: CalendarIcon },
    { num: 4, label: 'Specjalista', icon: UserIcon },
    { num: 5, label: 'Godzina', icon: ClockIcon },
    { num: 6, label: 'Potwierdzenie', icon: CheckIcon },
];

export default function StepProgress({ currentStep }: StepProgressProps) {
    return (
        <div className="flex items-center justify-center mb-8 w-full overflow-x-auto">
            <div className="flex min-w-max px-4">
                {steps.map((s, idx) => (
                    <React.Fragment key={s.num}>
                        <div className="flex flex-col items-center relative z-10">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors duration-300 ${s.num <= currentStep
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'bg-gray-200 text-gray-500'
                                    }`}
                            >
                                <s.icon className="w-5 h-5" />
                            </div>
                            <span
                                className={`text-xs mt-2 font-medium ${s.num <= currentStep ? 'text-blue-700' : 'text-gray-400'
                                    }`}
                            >
                                {s.label}
                            </span>
                        </div>
                        {idx < steps.length - 1 && (
                            <div
                                className={`w-8 sm:w-12 h-1 mx-2 mt-5 transition-colors duration-300 ${s.num < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                                    }`}
                            />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}
