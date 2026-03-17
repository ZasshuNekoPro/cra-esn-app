'use client';

import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { DocumentType } from '@esn/shared-types';
import { documentsApi } from '../../lib/api/documents';

const ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'text/plain',
  'application/zip',
];

interface UploadDropzoneProps {
  missionId: string;
  projectId?: string;
  onUploaded: () => void;
}

export function UploadDropzone({ missionId, projectId, onUploaded }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<DocumentType>(DocumentType.OTHER);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) selectFile(dropped);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) selectFile(picked);
  }

  function selectFile(f: File) {
    if (!ALLOWED_MIME.includes(f.type)) {
      setError(`Type de fichier non autorisé : ${f.type}`);
      return;
    }
    if (f.size > 52_428_800) {
      setError('Fichier trop volumineux (max 50 Mo)');
      return;
    }
    setError(null);
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''));
  }

  async function handleUpload() {
    if (!file || !name.trim()) return;
    setUploading(true);
    setError(null);
    try {
      await documentsApi.upload({ name: name.trim(), type, missionId, projectId, file });
      setFile(null);
      setName('');
      setType(DocumentType.OTHER);
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_MIME.join(',')}
          className="hidden"
          onChange={handleFileChange}
        />
        {file ? (
          <p className="text-sm text-gray-700 font-medium">{file.name}</p>
        ) : (
          <>
            <p className="text-sm text-gray-500">Glissez un fichier ici ou cliquez pour parcourir</p>
            <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, Images, ZIP — max 50 Mo</p>
          </>
        )}
      </div>

      {file && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nom du document</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Nom du document"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DocumentType)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={DocumentType.OTHER}>Autre</option>
              <option value={DocumentType.CONTRACT}>Contrat</option>
              <option value={DocumentType.AMENDMENT}>Avenant</option>
              <option value={DocumentType.MISSION_ORDER}>Ordre de mission</option>
            </select>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {file && (
        <button
          onClick={() => void handleUpload()}
          disabled={uploading || !name.trim()}
          className="w-full py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Upload en cours…' : 'Envoyer le document'}
        </button>
      )}
    </div>
  );
}
