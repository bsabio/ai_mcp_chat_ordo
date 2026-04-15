import type Database from "better-sqlite3";
import type { UserFile } from "@/core/entities/user-file";
import type { UserFileRepository } from "@/core/use-cases/UserFileRepository";
import { buildUserFileMetadata } from "@/lib/media/media-asset-projection";

interface UserFileRow {
  id: string;
  user_id: string;
  conversation_id: string | null;
  content_hash: string;
  file_type: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  metadata_json: string;
  created_at: string;
}

function parseMetadata(metadataJson: string | null | undefined): UserFile["metadata"] {
  if (!metadataJson || !metadataJson.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(metadataJson) as Partial<UserFile["metadata"]>;
    return buildUserFileMetadata(parsed);
  } catch {
    return {};
  }
}

function mapRow(row: UserFileRow): UserFile {
  return {
    id: row.id,
    userId: row.user_id,
    conversationId: row.conversation_id,
    contentHash: row.content_hash,
    fileType: row.file_type as UserFile["fileType"],
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    metadata: parseMetadata(row.metadata_json),
    createdAt: row.created_at,
  };
}

export class UserFileDataMapper implements UserFileRepository {
  constructor(private db: Database.Database) {}

  async create(file: Omit<UserFile, "createdAt">): Promise<UserFile> {
    this.db
      .prepare(
        `INSERT INTO user_files (id, user_id, conversation_id, content_hash, file_type, file_name, mime_type, file_size, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        file.id,
        file.userId,
        file.conversationId,
        file.contentHash,
        file.fileType,
        file.fileName,
        file.mimeType,
        file.fileSize,
        JSON.stringify(buildUserFileMetadata(file.metadata)),
      );

    const row = this.db
      .prepare(`SELECT * FROM user_files WHERE id = ?`)
      .get(file.id) as UserFileRow;

    return mapRow(row);
  }

  async findById(id: string): Promise<UserFile | null> {
    const row = this.db
      .prepare(`SELECT * FROM user_files WHERE id = ?`)
      .get(id) as UserFileRow | undefined;

    return row ? mapRow(row) : null;
  }

  async findByHash(
    userId: string,
    contentHash: string,
    fileType: UserFile["fileType"],
  ): Promise<UserFile | null> {
    const row = this.db
      .prepare(
        `SELECT * FROM user_files WHERE user_id = ? AND content_hash = ? AND file_type = ?`,
      )
      .get(userId, contentHash, fileType) as UserFileRow | undefined;

    return row ? mapRow(row) : null;
  }

  async listByConversation(conversationId: string): Promise<UserFile[]> {
    const rows = this.db
      .prepare(
        `SELECT * FROM user_files WHERE conversation_id = ? ORDER BY created_at ASC`,
      )
      .all(conversationId) as UserFileRow[];

    return rows.map(mapRow);
  }

  async listByUser(userId: string): Promise<UserFile[]> {
    const rows = this.db
      .prepare(
        `SELECT * FROM user_files WHERE user_id = ? ORDER BY created_at DESC`,
      )
      .all(userId) as UserFileRow[];

    return rows.map(mapRow);
  }

  async listUnattachedCreatedBefore(
    cutoffIso: string,
    options?: {
      userId?: string;
      fileType?: UserFile["fileType"];
    },
  ): Promise<UserFile[]> {
    const conditions = [
      `conversation_id IS NULL`,
      `datetime(created_at) < datetime(?)`,
    ];
    const params: unknown[] = [cutoffIso];

    if (options?.userId) {
      conditions.push(`user_id = ?`);
      params.push(options.userId);
    }

    if (options?.fileType) {
      conditions.push(`file_type = ?`);
      params.push(options.fileType);
    }

    const rows = this.db
      .prepare(
        `SELECT * FROM user_files
         WHERE ${conditions.join(" AND ")}
         ORDER BY created_at ASC`,
      )
      .all(...params) as UserFileRow[];

    return rows.map(mapRow);
  }

  async assignConversation(
    fileIds: string[],
    userId: string,
    conversationId: string,
  ): Promise<void> {
    if (fileIds.length === 0) {
      return;
    }

    const placeholders = fileIds.map(() => "?").join(", ");
    this.db
      .prepare(
        `UPDATE user_files
         SET conversation_id = ?
         WHERE user_id = ? AND id IN (${placeholders})`,
      )
      .run(conversationId, userId, ...fileIds);
  }

  async deleteIfUnattached(id: string, userId: string): Promise<UserFile | null> {
    const row = this.db
      .prepare(
        `SELECT * FROM user_files WHERE id = ? AND user_id = ? AND conversation_id IS NULL`,
      )
      .get(id, userId) as UserFileRow | undefined;

    if (!row) {
      return null;
    }

    this.db.prepare(`DELETE FROM user_files WHERE id = ?`).run(id);
    return mapRow(row);
  }

  async delete(id: string): Promise<void> {
    this.db.prepare(`DELETE FROM user_files WHERE id = ?`).run(id);
  }
}
