# apps.mediatheque

Médiathèque et centre de téléchargement — Bloc B. Documents publics
(`DocumentPublic`) et galeries photo/vidéo (`Galerie`/`MediaGalerie`)
consommées par le portail public (carrousel d'accueil, réinsertion, vie des
détenus, ou associées à un article).

## Import de photos depuis une page Facebook

`python manage.py importer_photos_facebook --token=<jeton>` importe les
photos d'une page Facebook publique dans une galerie brouillon
(`facebook-import` par défaut), via l'API Graph officielle de Meta — aucun
contournement d'authentification ni de protection anti-robot, uniquement
l'API documentée.

Les médias importés sont créés **non publiés** (`publie=False`) : une revue
manuelle (légende, cadrage, droits sur les personnes visibles) est requise
avant toute publication, depuis le back-office (Galeries).

### Obtenir un jeton d'accès Page

Nécessite d'être administrateur (ou d'avoir un accès administrateur délégué)
de la page Facebook à importer :

1. Aller sur [developers.facebook.com](https://developers.facebook.com) et
   créer une App (type « Entreprise »).
2. Dans l'App, ajouter le produit **Graph API Explorer**
   (Outils > Graph API Explorer).
3. Sélectionner l'App créée, puis la Page à importer dans le sélecteur
   « User or Page ».
4. Générer un jeton avec les permissions `pages_read_engagement` et
   `pages_show_list` (suffisant pour lister/lire les photos d'une page dont
   on est administrateur — pas besoin de revue d'app Meta pour un usage sur
   sa propre page).
5. Le jeton généré depuis l'explorateur est court (~1h) ; pour un import plus
   long, l'échanger contre un jeton longue durée via
   `GET /oauth/access_token?grant_type=fb_exchange_token&...` (voir la
   documentation Meta « Access Tokens »).

### Exemple

```sh
python manage.py importer_photos_facebook \
    --token="EAAxxxxx..." \
    --page-id="dgap.officielle" \
    --limite=50
```

`--limite=0` (défaut) importe toutes les photos disponibles, avec pagination
automatique. La commande est idempotente : relancée, elle ignore les photos
déjà importées (marqueur `[fb:<id>]` en préfixe de la légende).
