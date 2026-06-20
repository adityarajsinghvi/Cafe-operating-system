import type { ExtractionSource } from "@/types/database";
import type { MenuDraftPayload } from "@/types/menu";

export interface ExtractionImageInput {
  mimeType: string;
  base64: string;
}

export interface ExtractionTextInput {
  text: string;
  label?: string;
}

export interface MenuExtractionInput {
  source: ExtractionSource;
  images?: ExtractionImageInput[];
  textContent?: ExtractionTextInput[];
  currency?: string;
}

export interface MenuExtractionProvider {
  readonly name: string;
  extract(input: MenuExtractionInput): Promise<MenuDraftPayload>;
}
