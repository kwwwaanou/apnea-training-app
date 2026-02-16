# Changelog - Apnea Training App

## [1.3.2] - 2026-02-16
### Fixed
- **Audio Mixing (iOS)** : Optimisation pour permettre aux bips de jouer par-dessus la musique ou YouTube sans interruption (Web Audio API).

## [1.3.1] - 2026-02-16
### Added
- **Audio Beeps** : Signal sonore lors des 5 dernières secondes du timer.
- **Auto-start** : Lancement immédiat du timer après sélection d'une durée.
- **Screen Wake Lock** : Utilisation de l'API Wake Lock pour maintenir l'écran allumé.
### Fixed
- Correction de la logique O2 et de la barre de progression (fix crash).

## [1.3.0] - 2026-02-15
### Changed
- Alignement du branding (vagues bleues) et mise à jour des icônes.
- Stabilisation de la version 1.3.0-stable sur tous les composants.

## [1.2.9] - 2026-02-15
### Added
- Historique d'entraînement et calcul du score de difficulté.

## [1.2.7] / [1.2.8] - 2026-02-15
### Changed
- Refonte UX/Design : Optimisation AMOLED, Dashboard minimaliste et UI du Timer affinée.
- Rollback visuel vers la v1.2.6 tout en conservant les fonctionnalités de la v1.2.7.

## [1.2.6] - 2026-02-15
### Added
- Boutons de validation d'entraînement (Succès/Échec).
- Amélioration de la barre de progression UI.

## [1.2.5] - 2026-02-15
### Added
- **Dynamic Scaling** : Ajustement dynamique des tables CO2/O2.

## [1.2.2] / [1.2.4] - 2026-02-15
### Fixed
- Persistance des données et verrouillage d'hydratation du store.
- Centralisation de l'édition des Records Personnels (PB).
- Correction du bug de déconnexion au rafraîchissement de page.

## [1.2.0] - 2026-02-14
### Added
- **Hybrid Auth** : Introduction du mode local et synchronisation via "Pseudo-email".
- **Dashboard** : Section Données & Paramètres.
- Synchronisation Cloud (Supabase).

## [1.1.0] - 2026-02-14
### Added
- Mode Diagnostic, Tables intelligentes, Modal de sécurité et Graphiques de progression.

## [1.0.0] - 2026-02-14
### Added
- Initial commit : MVP de l'application d'entraînement à l'apnée.
