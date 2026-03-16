import type { CorpusRepository } from "../core/use-cases/CorpusRepository";
import { FileSystemCorpusRepository } from "./FileSystemCorpusRepository";
import { CachedCorpusRepository } from "./CachedCorpusRepository";

/**
 * Repository Factory
 * 
 * Provides a central point for resolving concrete repository implementations.
 * This facilitates the Dependency Inversion Principle (DIP).
 */

let repository: CorpusRepository | null = null;

export function getCorpusRepository(): CorpusRepository {
  if (!repository) {
    // In a multi-environment setup, we would check ENV here
    // to return a MockRepository or a CloudRepository.
    repository = new CachedCorpusRepository(new FileSystemCorpusRepository());
  }
  return repository;
}
