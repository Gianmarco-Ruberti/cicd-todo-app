# Schéma du workflow CI/CD — v1

Version simple. Source : CdC §7.3.1 et issues du repo.

```mermaid
flowchart TD
    A["Push / PR"] --> B["Install<br/>+ cache"]
    B --> C["Audit"]
    B --> D["Lint"]
    C --> E["Tests backend"]
    D --> E
    D --> F["Tests frontend<br/>3 navigateurs"]
    E --> G["Build"]
    F --> G
    G --> H["E2E"]
    H --> I{"CI verte ?"}
    I -- "non" --> J["Stop"]
    I -- "oui" --> K["Déploiement test<br/>auto sur main"]
    K -. "manuel + approbation" .-> L["Déploiement prod"]
```

- Trait plein : étape obligatoire.
- Pointillé : action manuelle.
- La prod n'est jamais déployée automatiquement.
