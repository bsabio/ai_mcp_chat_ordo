export function createConversationInteractorMock(overrides: {
  getActiveForUser?: unknown;
  list?: unknown;
  get?: unknown;
} = {}) {
  return {
    getActiveForUser: overrides.getActiveForUser,
    list: overrides.list,
    get: overrides.get,
  };
}