import React, { useState, useEffect } from 'react';

// Import all frames eagerly using Vite's glob import
const frameModules = import.meta.glob('../assets/tree_frames/*.png', { eager: true, as: 'url' });

// Convert object to array and sort by filename to ensure correct sequence
const frames = Object.keys(frameModules)
    .sort((a, b) => {
        // Extract numbers from filenames to sort numerically (e.g. frame-001 vs frame-010)
        const numA = parseInt(a.match(/(\d+)\.png$/)?.[1] || '0', 10);
        const numB = parseInt(b.match(/(\d+)\.png$/)?.[1] || '0', 10);
        return numA - numB;
    })
    .map(path => frameModules[path]);

export const ChristmasTreeAnimation = () => {
    const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

    useEffect(() => {
        let animationFrameId: number;
        let lastTime = 0;
        // Lower interval = faster animation. 30fps is roughly 33ms.
        const interval = 45;

        const animate = (time: number) => {
            if (time - lastTime >= interval) {
                setCurrentFrameIndex((prevIndex) => (prevIndex + 1) % frames.length);
                lastTime = time;
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    return (
        <div className="absolute bottom-0 left-0 z-20 pointer-events-none animate-walk-across">
            <img
                src={frames[currentFrameIndex]}
                alt="Walking Christmas Tree"
                className="w-48 h-auto filter drop-shadow-2xl"
            // Removed animate-wobble-walk because the frames themselves have the motion
            />
        </div>
    );
};
