
import React from 'react';
import { ProjectFile } from '../types';

interface EditorProps {
  file: ProjectFile | null;
  onUpdateContent: (content: string) => void;
  onUpdateMetadata: (name: string, path: string) => void;
}

export const Editor: React.FC<EditorProps> = ({ file, onUpdateContent, onUpdateMetadata }) => {
  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-neutral-950 text-neutral-600">
        <div className="p-8 border-2 border-dashed border-neutral-800 rounded-3xl text-center max-w-sm">
          <p className="text-lg font-medium text-neutral-400 mb-2">No File Selected</p>
          <p className="text-sm">Select a file from the workspace or add a new one to start architecting your solution.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-neutral-950 h-full">
      <div className="flex items-center space-x-4 p-4 border-b border-neutral-800 bg-neutral-900/30">
        <div className="flex-1 flex items-center space-x-2">
          <input 
            type="text" 
            value={file.name}
            onChange={(e) => onUpdateMetadata(e.target.value, file.path)}
            className="bg-transparent border-none focus:ring-0 text-sm font-semibold text-neutral-200 w-full"
            placeholder="Filename (e.g. index.tsx)"
          />
        </div>
        <div className="text-xs text-neutral-500 font-mono">
          {file.language.toUpperCase()}
        </div>
      </div>
      <div className="flex-1 relative">
        <textarea
          value={file.content}
          onChange={(e) => onUpdateContent(e.target.value)}
          className="absolute inset-0 w-full h-full bg-transparent p-6 text-sm code-font resize-none focus:outline-none text-neutral-300 leading-relaxed"
          spellCheck={false}
          placeholder="// Paste your existing code here..."
        />
      </div>
    </div>
  );
};
