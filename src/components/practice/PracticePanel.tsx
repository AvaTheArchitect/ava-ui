import React from 'react';
import PracticeGenerator from '../practice/PracticeGenerator';

export default function PracticePanel() {
  return (
    <div className="border p-4 bg-gray-50">
      <h2 className="text-xl mb-2">Practice Generator</h2>
      <PracticeGenerator />
    </div>
  );
}
