export type BlogAssetKind = "hero";
export type BlogAssetVisibility = "draft" | "published";
export type BlogAssetSelectionState = "selected" | "candidate" | "rejected";

export interface BlogAsset {
  id: string;
  postId: string | null;
  kind: BlogAssetKind;
  storagePath: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  altText: string;
  sourcePrompt: string | null;
  provider: string | null;
  providerModel: string | null;
  visibility: BlogAssetVisibility;
  selectionState: BlogAssetSelectionState;
  variationGroupId: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogAssetSeed {
  postId?: string | null;
  kind: BlogAssetKind;
  storagePath: string;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  altText: string;
  sourcePrompt?: string | null;
  provider?: string | null;
  providerModel?: string | null;
  visibility?: BlogAssetVisibility;
  selectionState?: BlogAssetSelectionState;
  variationGroupId?: string | null;
  createdByUserId: string;
}