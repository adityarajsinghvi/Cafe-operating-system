"use client";

import {
  Camera,
  FileText,
  Globe,
  Loader2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ExtractionSource } from "@/types/database";

type UploadOption = {
  id: ExtractionSource;
  title: string;
  description: string;
  icon: typeof Camera;
};

const options: UploadOption[] = [
  {
    id: "photo",
    title: "Menu photos",
    description: "Upload photos of your printed menu. Best for quick setup.",
    icon: Camera,
  },
  {
    id: "pdf",
    title: "PDF menu",
    description: "Upload an existing PDF menu file.",
    icon: FileText,
  },
  {
    id: "url",
    title: "Import from URL",
    description: "Website, Google Maps, or any public menu link.",
    icon: Globe,
  },
];

export function MenuUploadForm({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<ExtractionSource>("photo");
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("source", selected);

      if (selected === "url") {
        if (!url.trim()) {
          setError("Please enter a menu URL");
          setIsSubmitting(false);
          return;
        }
        formData.append("url", url.trim());
      } else {
        if (!files.length) {
          setError("Please select at least one file");
          setIsSubmitting(false);
          return;
        }
        files.forEach((file) => formData.append("files", file));
      }

      const response = await fetch(
        `/api/v1/dashboard/${restaurantId}/menu/extract`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Upload failed");
      }

      if (data.status === "failed") {
        throw new Error(data.error ?? "Menu extraction failed");
      }

      router.push(
        `/dashboard/${restaurantId}/menu/review/${data.jobId}`,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = selected === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setSelected(option.id);
                setError(null);
              }}
              className={cn(
                "rounded-2xl border p-4 text-left transition-all sm:p-5",
                isActive
                  ? "border-foreground bg-card shadow-md"
                  : "border-border bg-card/50 hover:border-foreground/20",
              )}
            >
              <Icon className="mb-3 h-5 w-5 text-muted-foreground" />
              <p className="font-medium">{option.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {selected === "photo" && "Upload menu photos"}
            {selected === "pdf" && "Upload PDF menu"}
            {selected === "url" && "Import menu URL"}
          </CardTitle>
          <CardDescription>
            AI will extract categories, items, prices, and dietary tags
            automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {selected === "url" ? (
            <div className="space-y-2">
              <Label htmlFor="menu-url">Menu URL</Label>
              <Input
                id="menu-url"
                placeholder="https://yourrestaurant.com/menu"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple={selected === "photo"}
                accept={
                  selected === "photo"
                    ? "image/jpeg,image/png,image/webp,image/heic"
                    : "application/pdf"
                }
                onChange={(e) => {
                  setFiles(Array.from(e.target.files ?? []));
                  setError(null);
                }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 transition-colors hover:bg-muted/50"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">Tap to upload</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selected === "photo"
                      ? "JPG, PNG, WEBP up to 10MB each"
                      : "PDF up to 10MB"}
                  </p>
                </div>
              </button>

              {files.length > 0 && (
                <div className="rounded-xl bg-muted/40 p-3 text-sm">
                  <p className="font-medium">{files.length} file(s) selected</p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {files.map((file) => (
                      <li key={file.name} className="truncate">
                        {file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            className="w-full sm:w-auto"
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Extracting menu...
              </>
            ) : (
              "Extract menu with AI"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
