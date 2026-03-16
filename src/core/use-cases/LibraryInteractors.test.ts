import { describe, it, expect, vi } from "vitest";
import { PractitionerInteractor } from "./PractitionerInteractor";
import { ChecklistInteractor } from "./ChecklistInteractor";
import { CorpusSummaryInteractor } from "./CorpusSummaryInteractor";
import type { CorpusRepository } from "./CorpusRepository";
import { Section } from "../entities/corpus";

const mockSections: Section[] = [
  new Section(
    "clean-code",
    "srp",
    "Single Responsibility",
    "Content...",
    ["Uncle Bob"],
    ["One reason to change"],
    ["Intro", "Rule"]
  ),
  new Section(
    "clean-code",
    "dip",
    "Dependency Inversion",
    "More Content...",
    ["Uncle Bob", "Martin Fowler"],
    ["Depend on abstractions"],
    ["Intro"]
  ),
];

const mockDocuments = [
  { slug: "clean-code", title: "Clean Code", number: "1" }
];

const mockRepo: CorpusRepository = {
  getAllDocuments: vi.fn().mockResolvedValue(mockDocuments),
  getAllSections: vi.fn().mockResolvedValue(mockSections),
  getSectionsByDocument: vi.fn(),
  getSection: vi.fn(),
  getDocument: vi.fn().mockResolvedValue(mockDocuments[0]),
};

describe("Library Interactors", () => {
  it("PractitionerInteractor should aggregate practitioners correctly", async () => {
    const interactor = new PractitionerInteractor(mockRepo);
    const results = await interactor.execute({});
    
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe("Uncle bob");
    expect(results[0].chapters).toHaveLength(2);
  });

  it("ChecklistInteractor should filter by book", async () => {
    const interactor = new ChecklistInteractor(mockRepo);
    const results = await interactor.execute({ bookSlug: "clean-code" });
    
    expect(results).toHaveLength(2);
    expect(results[0].items).toContain("One reason to change");
  });

  it("CorpusSummaryInteractor should provide counts", async () => {
    const interactor = new CorpusSummaryInteractor(mockRepo);
    const results = await interactor.execute();
    
    expect(results).toHaveLength(1);
    expect(results[0].chapterCount).toBe(2);
  });
});
