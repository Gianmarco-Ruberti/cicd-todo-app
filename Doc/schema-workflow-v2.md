# Schéma du workflow CI/CD — v2

Version simple. Source : CdC §7.3.1 et issues du repo.

```mermaid
flowchart TD
    A["Push / PR (main)"] --> B["Install<br/>+ cache"]
    B --> CBack["Audit Backend"]
    B --> CFront["Audit Frontend"]
    CFront --> DFront["Lint Frontend"]
    CBack --> DBack["Lint Backend"]
    DBack --> EBack["Tests Backend"]

    EBack --> F["Build"]
    DFront --> F

    F --> G["E2E Tests"]

    G --> H["Staging deploy"]

```

- Trait plein : étape obligatoire.
- Pointillé : action manuelle.
- La prod n'est jamais déployée automatiquement.
