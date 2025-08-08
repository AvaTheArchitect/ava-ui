'use client';

import React from 'react';

// src/app/cipher/page.tsx


import CipherConsole from '@/components/dev/CipherConsole';
import PracticePanel from '@/components/practice/PracticePanel';
import VisionPanel from '@/components/dev/VisionPanel';

export default function CipherPage() {
    return (
        <div className="p-6 space-y-10">
            <h1 className="text-3xl font-bold text-orange-500">🎸 Cipher Console</h1>
            <CipherConsole />
            <PracticePanel />
            <VisionPanel />
        </div>
    );
}
