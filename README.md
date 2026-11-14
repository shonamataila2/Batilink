# BatiLink — Prototype V1

## Contenu
- `index.html` : interface responsive de démonstration
- `manifest.json` : paramètres d'installation PWA
- `sw.js` : cache hors-ligne simple

## Ce que cette version permet
- Naviguer entre accueil, demande client, dossier professionnel, suivi et administration de démonstration.
- Enregistrer des demandes et dossiers localement dans le navigateur de l'appareil.
- Tester l'affichage sur téléphone et ordinateur.

## Limites importantes
Cette version n'est PAS une application de production :
- pas de serveur ni de base de données partagée ;
- pas de vrais comptes, mots de passe ou rôles sécurisés ;
- pas de transmission des demandes aux entreprises ;
- pas de contrôle réel RIDET, assurance ou identité ;
- pas de stockage sécurisé de documents ;
- l'espace admin est une simple maquette et n'est pas protégé.

Ne pas utiliser avec de vrais documents personnels ou professionnels.

## Étape suivante
Déployer cette interface sur un hébergement HTTPS, puis connecter une base de données et une authentification sécurisée (par exemple Supabase), avec un vrai compte propriétaire/admin.
