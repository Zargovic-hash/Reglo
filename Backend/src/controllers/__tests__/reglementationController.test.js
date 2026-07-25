import { buildReglementationQuery } from "../reglementationController.js";

describe("buildReglementationQuery", () => {
  const user = { id: 42, role: "user" };

  it("applique les filtres pris en charge avec une pagination bornée", () => {
    const result = buildReglementationQuery({
      search: "déchets industriels",
      titre: "Décret",
      domaine: "Déchets",
      sous_titre: "Dangereux",
      conformite: "Non Conforme",
      priorite: "Critique",
      owner: "HSE",
      deadline_from: "2026-01-01",
      deadline_to: "2026-12-31",
      page: "2",
      limit: "250",
    }, user);

    expect(result.page).toBe(2);
    expect(result.limit).toBe(100);
    expect(result.dataQuery).toContain('a."prioritée"');
    expect(result.dataQuery).toContain("r.sous_titre");
    expect(result.dataQuery).toContain("r.reference_reglementaire");
    expect(result.dataQuery).toContain("LIMIT");
    expect(result.dataQuery).toContain("OFFSET");
    expect(result.values).toEqual(expect.arrayContaining([
      42,
      "déchets industriels",
      "Décret",
      "Déchets",
      "Dangereux",
      "Non Conforme",
      "Critique",
      "HSE",
      "2026-01-01",
      "2026-12-31",
      100,
      100,
    ]));
  });

  it("accepte l'ancien alias prioritée", () => {
    const result = buildReglementationQuery({ prioritée: "Élevée" }, user);

    expect(result.values).toContain("Élevée");
  });

  it("rejette une plage de dates invalide", () => {
    expect(() => buildReglementationQuery({
      deadline_from: "2026-12-31",
      deadline_to: "2026-01-01",
    }, user)).toThrow("deadline_from doit être antérieur ou égal à deadline_to.");
  });
});
