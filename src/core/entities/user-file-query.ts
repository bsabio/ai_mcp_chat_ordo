import type { MediaAssetRetentionClass, MediaAssetSource } from "./media-asset";
import type { UserFile, UserFileType } from "./user-file";

export interface UserFileListCursor {
  createdAt: string;
  id: string;
}

export interface UserFileListFilters {
  search?: string;
  fileType?: UserFileType;
  source?: MediaAssetSource;
  retentionClass?: MediaAssetRetentionClass;
  attached?: boolean;
  limit: number;
  cursor?: UserFileListCursor | null;
}

export interface UserFileListPage {
  items: UserFile[];
  nextCursor: UserFileListCursor | null;
}

export interface AdminUserFileFilters {
  search?: string;
  userId?: string;
  conversationId?: string;
  fileType?: UserFileType;
  source?: MediaAssetSource;
  retentionClass?: MediaAssetRetentionClass;
  attached?: boolean;
}

export interface AdminUserFileListFilters extends AdminUserFileFilters {
  limit?: number;
  offset?: number;
}