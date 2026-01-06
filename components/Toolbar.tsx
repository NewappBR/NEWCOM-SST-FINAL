
import React from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  FileUp,
  Save
} from 'lucide-react';

interface ToolbarProps {
  onAddRow: () => void;
  onClear: () => void;
  onAIAction: () => void;
  onDownload: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onClear, onDownload }) => {
  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1 border-r dark:border-gray-800 pr-2">
        <button onClick={onClear} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 rounded-lg transition-colors text-gray-400" title="Limpar">
          <Trash2 size={16} />
        </button>
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-[#252525] rounded-lg text-gray-400" title="Importar">
          <FileUp size={16} />
        </button>
      </div>

      <button onClick={() => {}} className="hidden md:flex items-center space-x-2 px-3 py-1.5 border dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors text-[10px] font-bold text-gray-500 dark:text-gray-400">
        <Save size={14} />
        <span>SALVAR</span>
      </button>

      <button onClick={onDownload} className="flex items-center space-x-2 px-4 py-1.5 bg-[#76923c] hover:bg-[#375623] text-white rounded-lg transition-all font-bold text-[10px] shadow-sm active:scale-95">
        <Download size={14} />
        <span className="hidden sm:inline">RELATÓRIO</span>
      </button>
    </div>
  );
};

export default Toolbar;
