import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PhotoUploader({ serviceRecordId, photos, onPhotosChange }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const photo = await base44.entities.ServicePhoto.create({
        service_record_id: serviceRecordId,
        photo_url: file_url,
        photo_type: "evidence",
        caption: "",
      });
      onPhotosChange(prev => [...prev, photo]);
    }
    setUploading(false);
  };

  const handleTypeChange = async (photoId, newType) => {
    await base44.entities.ServicePhoto.update(photoId, { photo_type: newType });
    onPhotosChange(prev =>
      prev.map(p => (p.id === photoId ? { ...p, photo_type: newType } : p))
    );
  };

  const handleDelete = async (photoId) => {
    await base44.entities.ServicePhoto.delete(photoId);
    onPhotosChange(prev => prev.filter(p => p.id !== photoId));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Photos ({photos.length})</span>
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button type="button" variant="secondary" size="sm" className="gap-1.5 pointer-events-none" disabled={uploading}>
            <Camera className="w-4 h-4" />
            {uploading ? "Uploading..." : "Add Photo"}
          </Button>
        </label>
      </div>

      {photos.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
          <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No photos yet</p>
          <p className="text-xs text-muted-foreground">Tap "Add Photo" to capture before/after images</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative rounded-xl overflow-hidden border border-border bg-secondary">
              <img
                src={photo.photo_url}
                alt={photo.caption || "Service photo"}
                className="w-full h-32 object-cover"
              />
              <button
                type="button"
                onClick={() => handleDelete(photo.id)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
              <div className="p-2">
                <Select value={photo.photo_type} onValueChange={(v) => handleTypeChange(photo.id, v)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before">Before</SelectItem>
                    <SelectItem value="after">After</SelectItem>
                    <SelectItem value="evidence">Evidence</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}