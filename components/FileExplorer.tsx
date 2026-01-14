
import React from 'react';
import { ProjectFile } from '../types';
import { ICONS } from '../constants';

interface FileExplorerProps {
  files: ProjectFile[];
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onAddFile: () => void;
  onDeleteFile: (id: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onAddFile,
  onDeleteFile
}) => {
  return (
    <div className="w-64 border-r border-neutral-800 flex flex-col h-full bg-neutral-900/50 backdrop-blur-xl">
      <div className="p-4 flex items-center justify-between border-b border-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Workspace</h2>
        <button 
          onClick={onAddFile}
          className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 transition-colors"
          title="Add File"
        >
          <ICONS.Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {files.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-neutral-500 italic">No files in project context. Add snippets or files to begin.</p>
          </div>
        ) : (
          files.map((file) => (
            <div 
              key={file.id}
              className={`group flex items-center px-4 py-2 cursor-pointer transition-all duration-150 ${
                activeFileId === file.id ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500' : 'text-neutral-400 hover:bg-neutral-800 border-l-2 border-transparent'
              }`}
              onClick={() => onSelectFile(file.id)}
            >
              <ICONS.File className="w-4 h-4 mr-3 flex-shrink-0" />
              <span className="text-sm truncate flex-1 font-medium">{file.name}</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFile(file.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
              >
                <ICONS.Trash className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t border-neutral-800">
        <div className="flex items-center text-xs text-neutral-500 space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span>Gemini-3-Pro Ready</span>
        </div>
      </div>
    </div>
  );
};
