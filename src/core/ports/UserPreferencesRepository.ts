export interface UserPreference {
  key: string;
  value: string;
  updatedAt: string;
}

export interface UserPreferencesRepository {
  getAll(userId: string): Promise<UserPreference[]>;
  get(userId: string, key: string): Promise<UserPreference | null>;
  set(userId: string, key: string, value: string): Promise<void>;
  delete(userId: string, key: string): Promise<void>;
}
