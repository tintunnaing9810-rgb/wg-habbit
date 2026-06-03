"use client";

import React, { useRef, useState } from "react";
import { Camera, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AvatarUploadProps = {
  userId: string;
  name: string;
  currentAvatarUrl: string | null;
  onUpdate: (url: string) => void;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

export function AvatarUpload({ userId, name, currentAvatarUrl, onUpdate }: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2 MB.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

      // Update user record
      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      onUpdate(publicUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative h-20 w-20 rounded-full overflow-hidden bg-indigo-100 hover:opacity-90 transition-opacity"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-indigo-700">
            {getInitials(name)}
          </span>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? (
            <LoaderCircle className="h-6 w-6 animate-spin text-white" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="btn-ghost text-xs py-1.5 px-3"
      >
        {uploading ? "Uploading..." : "Change photo"}
      </button>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
