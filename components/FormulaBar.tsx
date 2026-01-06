
import React from 'react';

interface FormulaBarProps {
  activeCell: string | null;
  value: string;
  onChange: (val: string) => void;
}

const FormulaBar: React.FC<FormulaBarProps> = ({ activeCell, value, onChange }) => {
  return (
    <div className="flex items-center border-b border-gray-200 bg-white px-2 py-1">
      <div className="w-16 text-center text-sm font-medium text-gray-500 border-r border-gray-200 py-1">
        {activeCell || ''}
      </div>
      <div className="px-2 text-gray-400 font-serif italic font-bold">fx</div>
      <input
        type="text"
        className="flex-1 px-2 py-1 text-sm focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Insira um valor ou fórmula (ex: =SUM(A1:A10))"
      />
    </div>
  );
};

export default FormulaBar;
