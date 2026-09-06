# Marco Prime — accès Fouaille à compléter

Ce document sépare les trois configurations. Il n'existe pas de `venv` Python
dans ce projet : ici, `.env` désigne un **fichier de variables d'environnement**.

## 1. Installation finale Docker / Orange Pi

Fichier utilisé :

`Marco Prime/.env.orange-pi`

Le seul champ Fouaille obligatoire à remplacer est :

```dotenv
DATABASE_URL=mysql://UTILISATEUR:MOT_DE_PASSE@HOTE:3306/NOM_DE_LA_BASE
```

Valeurs à demander à la responsable :

- `UTILISATEUR` : compte MySQL dédié à Marco Prime ;
- `MOT_DE_PASSE` : mot de passe de ce compte ;
- `HOTE` : nom DNS ou adresse IP privée de MySQL, joignable depuis l'Orange Pi ;
- `3306` : confirmer le port MySQL ;
- `NOM_DE_LA_BASE` : nom exact de la base Fouaille ;
- méthode réseau : VLAN, VPN ou liste blanche de l'adresse IP de l'Orange Pi ;
- chiffrement TLS éventuel et certificat CA à installer.

La ligne finale devra donc contenir les vraies valeurs, sans texte générique :

```dotenv
DATABASE_URL=mysql://vrai_utilisateur:vrai_mot_de_passe@vrai_hote:vrai_port/vraie_base
```

Si le mot de passe contient `@`, `:`, `/`, `?`, `#` ou `%`, ces caractères
devront être encodés dans l'URL. Lorsque les valeurs seront fournies, elles
pourront être placées directement dans ce fichier.

Avec une connexion directe à la base Fouaille :

```dotenv
FOUAILLE_API_URL=https://fouaille.bde-tps.fr/api/product
FOUAILLE_SYNC_ENABLED=false
```

`false` ne coupe pas Fouaille : il désactive seulement la copie périodique du
catalogue HTTP. Toutes les lectures et écritures passent alors directement par
`DATABASE_URL`, donc les nouveaux produits sont visibles immédiatement.

Le conteneur est actuellement limité à `127.0.0.1:3000`. Dans ce mode kiosque
local, ces valeurs peuvent rester ainsi :

```dotenv
API_AUTH_ENABLED=false
API_TOKEN=
```

`API_TOKEN` est un secret interne entre le frontend Marco et le backend Marco.
Ce n'est ni un token Fouaille ni un identifiant CAS. Il ne faut rien demander à
la responsable pour ce champ. Si l'API Marco est un jour exposée sur le réseau,
activer l'authentification et générer localement un token aléatoire.

## 2. Test local sur le Mac sans Docker

Backend :

`Marco Prime/marco-prime-backend/.env`

À remplacer pour tester sur la vraie base :

```dotenv
DATABASE_URL=mysql://UTILISATEUR:MOT_DE_PASSE@HOTE:3306/NOM_DE_LA_BASE
```

À conserver ou ajouter :

```dotenv
API_AUTH_ENABLED=true
API_TOKEN=UN_SECRET_LOCAL_MARCO
FOUAILLE_SYNC_ENABLED=false
```

Frontend :

`Marco Prime/marco-prime-frontend/.env.local`

```dotenv
VITE_API_URL=http://127.0.0.1:3000/api/v1
VITE_API_TOKEN=UN_SECRET_LOCAL_MARCO
```

`VITE_API_TOKEN` doit être strictement identique à `API_TOKEN` du backend. Le
fichier `.env.local` est prioritaire sur `marco-prime-frontend/.env`. Aucun
identifiant MySQL ne doit être placé dans le frontend.

État constaté le 4 septembre 2026 : les deux tokens de développement présents
sur le Bureau ne correspondent pas. Il faudra copier la même valeur dans les
deux fichiers avant un lancement séparé backend/frontend.

## 3. Fichier `.env` de Fouaille Manager

Le dépôt public `site-gestion-fouaille` ne versionne aucun `.env` ni
`.env.example`, malgré la mention du README. Il ne contient aucun identifiant de
production récupérable.

Fouaille Manager accepte côté serveur :

```dotenv
DB_CONNECTION=mysql
DB_HOST=...
DB_PORT=3306
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...
MYSQL_ATTR_SSL_CA=...

CAS_HOSTNAME=cas.unistra.fr
CAS_REAL_HOSTS=cas.unistra.fr
CAS_CLIENT_SERVICE=https://ADRESSE_DU_SITE_FOUAILLE
CAS_WHITE_LIST=IDENTIFIANT_CAS_1,IDENTIFIANT_CAS_2
```

Ces variables servent à déployer ou administrer le site Fouaille lui-même. Elles
ne doivent pas être copiées dans le frontend Marco. Le login humain du site se
fait par CAS Unistra et `CAS_WHITE_LIST`; il n'existe pas de couple
utilisateur/mot de passe local fourni dans GitHub. Les membres créés par le
seeder sont aléatoires et réservés au développement.

## Droits SQL minimaux à demander

Le compte `marco_prime` devrait être limité à :

- `SELECT` sur `members`, `products`, `product_types` et `orders` ;
- `UPDATE` du seul champ `members.balance` ;
- `INSERT` dans `orders` ;
- aucun droit `DROP`, `ALTER`, `CREATE`, `DELETE` ou gestion des utilisateurs.

Il faut également faire confirmer par la responsable que le schéma de
production possède bien les tables et colonnes du dépôt public, notamment
`members.card_number`, `members.balance`, `members.admin`, `products.available`,
`products.product_type_id` et les colonnes de `orders`.

## Message prêt à envoyer à la responsable

> Bonjour, nous préparons l'installation de Marco Prime sur un Orange Pi. Le
> catalogue public Fouaille est lisible, mais les achats et recharges nécessitent
> une source autorisée pour les membres, soldes et transactions. Quelle méthode
> machine-à-machine souhaitez-vous valider : une API privée authentifiée ou un
> accès direct MySQL ?
>
> Si l'accès MySQL est autorisé, pourriez-vous créer un compte dédié
> `marco_prime` et nous transmettre toutes les valeurs suivantes :
>
> - `DB_HOST` : hôte ou adresse IP MySQL ;
> - `DB_PORT` : port MySQL ;
> - `DB_DATABASE` : nom exact de la base ;
> - `DB_USERNAME` : utilisateur SQL de Marco ;
> - `DB_PASSWORD` : mot de passe SQL de Marco ;
> - `MYSQL_ATTR_SSL_CA` : certificat CA ou indication qu'il n'est pas nécessaire ;
> - méthode d'accès depuis le Mac et l'Orange Pi : réseau local, VLAN, VPN,
>   tunnel SSH ou liste blanche d'adresses IP ;
> - adresse IP fixe à déclarer, le cas échéant.
>
> Ces éléments permettront de construire la variable complète
> `DATABASE_URL=mysql://DB_USERNAME:DB_PASSWORD@DB_HOST:DB_PORT/DB_DATABASE`. Les
> droits nécessaires sont SELECT sur `members`, `products`, `product_types` et
> `orders`, UPDATE uniquement sur `members.balance`, et INSERT sur `orders`.
> Pouvez-vous aussi confirmer que le schéma de production correspond aux
> migrations du dépôt public et nous fournir si possible une base de test ?
>
> Si vous préférez une API privée, il nous faut son URL, son mode
> d'authentification et les opérations suivantes : membre par numéro de carte,
> lecture du solde, catalogue disponible, achat atomique (débit + commande),
> recharge atomique, historique et endpoint de santé. Merci de préciser aussi
> les limites de débit et la politique lorsque le réseau est indisponible.
>
> Pour l'accès humain au site Fouaille Manager, pouvez-vous également confirmer
> `CAS_HOSTNAME`, `CAS_REAL_HOSTS`, `CAS_CLIENT_SERVICE` et les identifiants
> Unistra autorisés dans `CAS_WHITE_LIST` ? Ces paramètres CAS sont séparés de
> l'accès de Marco à MySQL.

## Contrôle avant lancement réel

Une fois les informations reçues :

1. tester uniquement la connexion et des lectures sur une base de test ;
2. vérifier une carte membre de test et son solde ;
3. réaliser un achat et une recharge de test avec validation côté Fouaille ;
4. ne jamais exécuter `pnpm db:seed` ou une migration sur la base de production ;
5. seulement ensuite déployer sur l'Orange Pi.
