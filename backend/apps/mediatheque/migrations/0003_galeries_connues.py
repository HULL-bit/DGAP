"""Pré-crée les galeries dont le code est référencé en dur par le front public
(carrousel d'accueil, vie des détenus, ateliers de réinsertion) — sans ceci, un
rédacteur non technicien devrait deviner/saisir le bon `code` à la main dans le
back-office avant de pouvoir y ajouter des médias."""

from django.db import migrations

CODES_REINSERTION = [
    ("menuiserie", "Réinsertion — Menuiserie (bois & métallique)"),
    ("mecanique", "Réinsertion — Mécanique et garage-dépannage"),
    ("lavage-auto", "Réinsertion — Lavage automobile"),
    ("tapisserie", "Réinsertion — Tapisserie"),
    ("art-decoration", "Réinsertion — Art & décoration"),
    ("transformation-cereales", "Réinsertion — Transformation de céréales"),
    ("jus-locaux", "Réinsertion — Jus locaux"),
    ("couture", "Réinsertion — Couture"),
    ("coiffure", "Réinsertion — Coiffure"),
    ("broderie-tricotage", "Réinsertion — Broderie & tricotage"),
    ("boulangerie-patisserie", "Réinsertion — Boulangerie-pâtisserie"),
    ("agriculture", "Réinsertion — Agriculture"),
    ("elevage", "Réinsertion — Élevage"),
]


def creer_galeries_connues(apps, schema_editor):
    Galerie = apps.get_model("mediatheque", "Galerie")

    Galerie.objects.get_or_create(
        code="accueil-carrousel",
        defaults={
            "titre": "Carrousel d'accueil",
            "description": "Images mises en avant en haut de la page d'accueil du portail.",
        },
    )
    Galerie.objects.get_or_create(
        code="vie-detenus",
        defaults={
            "titre": "Vie des détenus",
            "description": "Galerie illustrant la page « Vie des détenus ».",
        },
    )
    for slug, titre in CODES_REINSERTION:
        Galerie.objects.get_or_create(
            code=f"reinsertion-{slug}",
            defaults={"titre": titre, "description": "Galerie de l'atelier de réinsertion."},
        )


def supprimer_galeries_connues(apps, schema_editor):
    Galerie = apps.get_model("mediatheque", "Galerie")
    codes = ["accueil-carrousel", "vie-detenus"] + [
        f"reinsertion-{slug}" for slug, _ in CODES_REINSERTION
    ]
    Galerie.objects.filter(code__in=codes, medias__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("mediatheque", "0002_galerie_mediagalerie"),
    ]

    operations = [
        migrations.RunPython(creer_galeries_connues, supprimer_galeries_connues),
    ]
