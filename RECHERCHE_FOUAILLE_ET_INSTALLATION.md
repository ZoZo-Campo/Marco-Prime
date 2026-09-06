# Marco Prime — intégration Fouaille et installation Orange Pi

État de l'étude : 4 septembre 2026.

## Réponse courte

Il n'existe pas de fichier JSON ou JSONL de catalogue dans les trois dépôts
publics examinés. Fouaille Manager fournit directement le catalogue en JSON avec
`GET https://fouaille.bde-tps.fr/api/product`. Cette réponse contient déjà les
catégories et leurs produits ; appeler séparément `/api/productType` serait donc
redondant pour Marco Prime.

Le frontend Marco Prime restait vide parce qu'il appelait deux routes absentes du
backend : `/api/v1/product-types` et `/api/v1/products/:categoryId`. Elles sont
maintenant présentes, documentées, paginées et testées. Le backend synchronise
le catalogue Fouaille au démarrage puis toutes les cinq minutes, sans supprimer
les anciens produits nécessaires aux historiques. En cas de panne réseau, il
conserve le dernier catalogue local.

La Marco possède maintenant une seconde couche indépendante : un administrateur
choisit dans `Config` le sous-ensemble réellement vendu pendant la soirée. Cette
sélection locale ne modifie ni le catalogue ni le statut de disponibilité dans
Fouaille Manager.

## Ce que Fouaille Manager fournit réellement

Le contrôleur officiel renvoie les catégories et uniquement leurs produits
disponibles. Les champs utiles sont `id`, `product_type`, puis pour chaque produit
`id`, `name`, `title`, `price` et `color`. Les identifiants officiels sont
conservés lors de la synchronisation afin d'éviter une table de correspondance
artificielle. Voir le
[contrôleur produit officiel](https://github.com/info-telecom-strasbourg/site-gestion-fouaille/blob/main/app/Http/Controllers/Api/ApiProductController.php)
et les [routes API officielles](https://github.com/info-telecom-strasbourg/site-gestion-fouaille/blob/main/routes/api.php).

L'autre application de l'école, `marco-app`, confirme ce fonctionnement : elle
consomme elle aussi les deux endpoints publics et valide leur réponse avant de
l'utiliser. Voir ses
[requêtes produits](https://github.com/info-telecom-strasbourg/marco-app/blob/master/src/query/fouaille/products.ts)
et ses [schémas Fouaille](https://github.com/info-telecom-strasbourg/marco-app/tree/master/src/schemas/fouaille).

Au 4 septembre 2026, l'endpoint catalogue public contenait 8 catégories et 49
produits, dont 3 catégories vides. Le dépôt public expose aussi une recherche de
membre par prénom (nom et solde) et des totaux de commandes, mais pas la
recherche par carte ni une création d'achat ou une recharge authentifiée. Ces
routes publiques ne constituent donc pas le contrat sécurisé requis par Marco.

## Limite essentielle avant la mise en production

Le catalogue est désormais intégré, mais le dépôt public de Fouaille ne publie
pas de contrat d'API permettant à Marco Prime de lire un membre, débiter son
solde, enregistrer un achat ou effectuer une recharge. Le schéma SQL public est
très proche de celui de Marco Prime, mais une connexion directe à la base ne doit
être choisie qu'avec l'accord de l'équipe Fouaille, un compte MySQL dédié et un
accès réseau privé.

Avant d'installer la borne réelle, il faut donc obtenir de l'école l'une de ces
deux solutions :

1. une API authentifiée officielle pour membres, soldes, achats et recharges —
   solution recommandée ;
2. à défaut, un accès MySQL privé et restreint, avec validation des migrations et
   des contraintes par l'équipe Fouaille.

Une base locale indépendante sur l'Orange Pi serait adaptée à une démonstration,
mais pas à la production : les soldes et achats divergeraient de Fouaille.

## Correctifs réalisés

- Ajout des routes catalogue attendues par le frontend, avec pagination et
  validation des paramètres.
- Synchronisation du catalogue Fouaille, validation Zod et repli sur les données
  déjà stockées en cas d'erreur réseau.
- Écrans d'erreur et bouton de nouvelle tentative à la place d'un chargement
  infini.
- Page `Config` complète : accès par carte administrateur, sélection tactile du
  sous-catalogue de la soirée, enregistrement atomique et persistant sur la borne.
- Les nouveaux produits Fouaille ne sont pas activés automatiquement après la
  première configuration ; un administrateur doit les cocher sur Marco.
- URL d'API centralisée et configurable ; suppression des adresses localhost
  dispersées dans le frontend.
- Tolérance des couleurs absentes, hexadécimales courtes et anciens noms comme
  `red`, afin qu'une seule donnée incorrecte ne fasse plus planter l'écran.
- Verrouillage transactionnel du membre pendant un achat ou une recharge pour
  empêcher deux opérations simultanées de perdre une mise à jour ou de créer un
  solde négatif.
- Production allégée : le backend Hono sert le frontend compilé. Il n'y a qu'un
  conteneur applicatif et aucun serveur de développement Vite sur l'Orange Pi.
- La sélection est stockée dans le volume local `marco_prime_data`, pas dans la
  base Fouaille, et survit aux redémarrages du conteneur.
- Image ARM64-compatible basée sur Node.js 24 LTS, contrôle de santé Docker,
  redémarrage automatique et volume de journaux.

Aucune bibliothèque applicative n'a été ajoutée.

## Installation recommandée sur Orange Pi

Une VM sur l'Orange Pi ajouterait du coût CPU et mémoire sans bénéfice. Installer
un système ARM64 natif (Armbian ou Debian/Ubuntu pris en charge par le modèle),
puis Docker Engine. La documentation Armbian décrit l'installation vers le
stockage interne et Docker documente officiellement l'installation sur Debian :
[Armbian](https://docs.armbian.com/getting-started/install-to-internal-storage/),
[Docker Engine](https://docs.docker.com/engine/install/debian/).

Après avoir copié le dossier `Marco Prime` sur la carte :

```bash
cd /opt/marco-prime
cp .env.orange-pi.example .env.orange-pi
nano .env.orange-pi
docker compose -f compose.orange-pi.yml --env-file .env.orange-pi up -d --build
docker compose -f compose.orange-pi.yml --env-file .env.orange-pi ps
```

Renseigner impérativement dans `.env.orange-pi` la source de données validée par
l'école. Ne jamais lancer `pnpm db:seed` sur cette base. L'interface est ensuite
disponible à `http://127.0.0.1:3001/`. Chromium doit démarrer en mode kiosque sur
cette page d'accueil ; l'utilisateur choisit ensuite la fonction voulue.

Le port est volontairement lié à `127.0.0.1`, donc inaccessible depuis le réseau.
Si une administration distante est demandée plus tard, conserver ce bind et
passer par un VPN ou un proxy HTTPS authentifié plutôt que d'exposer directement
le service et MySQL.

## Démarrage automatique sur Raspberry Pi 4

Sur Raspberry Pi OS Lite 64 bits, le script `install-raspberry-pi.sh` installe le
minimum graphique nécessaire (Cage et Chromium), Docker et les deux services de
démarrage. Il ouvre automatiquement la page Home sur le port 3001 en plein écran,
seulement lorsque l'application et la base SQL répondent à `/ready`.

Depuis la racine du projet copié sur le Raspberry :

```bash
chmod +x install-raspberry-pi.sh
sudo ./install-raspberry-pi.sh
sudo reboot
```

Le script utilise le compte ayant lancé `sudo` comme utilisateur du kiosque. Si
le projet est installé depuis une session root, préciser explicitement le compte :

```bash
sudo ./install-raspberry-pi.sh NOM_UTILISATEUR
```

Il copie l'application dans `/opt/marco-prime` et crée les services
`marco-prime.service` et `marco-kiosk.service`. Aucun bureau complet n'est
installé. L'administration reste disponible par SSH.

Docker recommande une politique de redémarrage pour les services persistants et
permet des images multi-architectures ; Vite recommande de servir le dossier de
build statique avec un véritable serveur web, ce que fait ici Hono :
[redémarrage Docker](https://docs.docker.com/engine/containers/start-containers-automatically/),
[builds multi-plateformes](https://docs.docker.com/build/building/multi-platform/),
[build Vite](https://vite.dev/guide/build),
[service statique Hono](https://hono.dev/docs/getting-started/nodejs).

## Validation effectuée

- compilation TypeScript du backend : réussie ;
- compilation et build Vite du frontend : réussis, bundle JavaScript d'environ
  349 Ko (environ 90 Ko compressés) ;
- suite backend complète : 33/33 tests ;
- tests transactionnels achats et recharges : 14/14 ;
- image Docker complète : construite avec succès ;
- conteneur de production : sain ;
- `/health`, catégories et produits paginés : réponses HTTP 200 ;
- contrôle dans le navigateur sur `/buy` : catégories et produits visibles,
  aucune erreur console.
- contrôle du parcours administrateur : deux produits retirés, disparition
  immédiate dans `Achats`, persistance après redémarrage, puis restauration du
  catalogue de démonstration.

Les paiements réels, la recharge réelle et le lecteur RFID physique restent à
valider sur le réseau et le matériel de l'école, après obtention du contrat
d'accès Fouaille manquant.

## Sources principales

- [Dépôt Fouaille Manager](https://github.com/info-telecom-strasbourg/site-gestion-fouaille)
- [Dépôt Marco Prime backend](https://github.com/info-telecom-strasbourg/marco-prime-backend)
- [Dépôt Marco Prime frontend](https://github.com/info-telecom-strasbourg/marco-prime-frontend)
- [Cycle de support Node.js](https://nodejs.org/en/about/previous-releases)
- [Image Docker officielle MySQL](https://hub.docker.com/_/mysql)
