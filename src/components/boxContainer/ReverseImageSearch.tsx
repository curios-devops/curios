import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

export type ReverseImageAttachment = {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
};

type ReverseImageSearchProps = {
  maxFiles?: number;
  maxFileSizeMB?: number;
  maxTotalSizeMB?: number;
  onChange?: (attachments: ReverseImageAttachment[]) => void;
  session?: Session | null;
  onSignInRequired?: () => void;
};

export interface ReverseImageSearchHandle {
  openFilePicker: () => void;
  clear: () => void;
}

const BYTES_IN_MB = 1024 * 1024;

const allowedMimeTypes = new Set(["image/png", "image/jpeg"]);

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

const ReverseImageSearch = React.forwardRef<ReverseImageSearchHandle, ReverseImageSearchProps>(
  (
    {
      maxFiles = 5,
      maxFileSizeMB = 5,
      maxTotalSizeMB = 10,
      onChange,
      session,
      onSignInRequired,
    },
    ref,
  ) => {
    const [attachments, setAttachments] = useState<ReverseImageAttachment[]>([]);
    const attachmentsRef = useRef<ReverseImageAttachment[]>([]);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const maxFileSizeBytes = useMemo(() => maxFileSizeMB * BYTES_IN_MB, [maxFileSizeMB]);
    const maxTotalSizeBytes = useMemo(() => maxTotalSizeMB * BYTES_IN_MB, [maxTotalSizeMB]);

    const totalSize = useMemo(
      () => attachments.reduce((sum, attachment) => sum + attachment.size, 0),
      [attachments],
    );

    useImperativeHandle(ref, () => ({
      openFilePicker: () => {
        setError(null);
        fileInputRef.current?.click();
      },
      clear: () => {
        setAttachments((prev) => {
          prev.forEach((item) => URL.revokeObjectURL(item.url));
          return [];
        });
        setError(null);
        onChange?.([]);
      },
    }), [onChange]);

    useEffect(() => {
      attachmentsRef.current = attachments;
    }, [attachments]);

    useEffect(() => {
      return () => {
        attachmentsRef.current.forEach((attachment) => URL.revokeObjectURL(attachment.url));
      };
    }, []);

    const handleFiles = (files: FileList | null) => {
      if (!files || files.length === 0) return;

      // Check if user is a guest (no session)
      const isGuest = !session;
      const guestMaxFiles = 3;
      const userMaxFiles = isGuest ? guestMaxFiles : maxFiles;

      const newAttachments: ReverseImageAttachment[] = [];
      const errors: string[] = [];
      let currentTotal = totalSize;

      for (const file of Array.from(files)) {
        // Check if we've reached the max number of files
        if (attachments.length + newAttachments.length >= userMaxFiles) {
          // If guest user tries to add more than 3, show sign-in modal
          if (isGuest && onSignInRequired) {
            onSignInRequired();
            return; // Exit early without showing error
          }
          errors.push(`You can only add up to ${userMaxFiles} images.`);
          break;
        }

        // Validate file type
        if (!allowedMimeTypes.has(file.type)) {
          errors.push('Only PNG and JPEG images are allowed.');
          continue;
        }

        // Validate individual file size
        if (file.size > maxFileSizeBytes) {
          errors.push(`${file.name} is larger than ${maxFileSizeMB} MB.`);
          continue;
        }

        // Validate total size
        if (currentTotal + file.size > maxTotalSizeBytes) {
          errors.push(`Selected images exceed the ${maxTotalSizeMB} MB combined limit.`);
          break;
        }

        // Add the file
        newAttachments.push({
          id: generateId(),
          file,
          url: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
        });

        currentTotal += file.size;
      }

      // Update error state
      setError(errors[0] ?? null);

      // For guest users, only take first 3 images if they selected more
      const imagesToAdd = isGuest ? newAttachments.slice(0, guestMaxFiles) : newAttachments;

      // Update attachments if we have new files
      if (imagesToAdd.length > 0) {
        const nextAttachments = [...attachments, ...imagesToAdd];
        setAttachments(nextAttachments);
        onChange?.(nextAttachments);
      }
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(event.target.files);
      // Reset input to allow selecting same file again later
      event.target.value = '';
    };

    const removeAttachment = (attachmentId: string) => {
      const itemToRemove = attachments.find((item) => item.id === attachmentId);
      if (!itemToRemove) return;

      // Revoke the blob URL immediately
      URL.revokeObjectURL(itemToRemove.url);

      // Update state with filtered array
      const nextAttachments = attachments.filter((item) => item.id !== attachmentId);
      
      // Clear error if no attachments left
      if (nextAttachments.length === 0) {
        setError(null);
      }

      setAttachments(nextAttachments);
      onChange?.(nextAttachments);
    };

    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />

        {attachments.length > 0 && (
          <div className="px-4 pt-2">
            <div className="flex gap-3 overflow-x-auto pb-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex-shrink-0 flex items-center gap-3 bg-gray-100 dark:bg-[#383838] rounded-xl px-3 py-2 min-w-[200px] max-w-xs relative"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#2a2a2a]">
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {attachment.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatBytes(attachment.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeAttachment(attachment.id);
                    }}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                    aria-label="Remove image"
                    tabIndex={0}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="px-4 pt-2">
            <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
          </div>
        )}
      </>
    );
  },
);

ReverseImageSearch.displayName = 'ReverseImageSearch';

export default ReverseImageSearch;
