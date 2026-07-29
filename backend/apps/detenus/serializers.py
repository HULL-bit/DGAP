from rest_framework import serializers

from .models import Mouvement, PersonneDetenue


class MouvementSerializer(serializers.ModelSerializer):
    etablissement_destination_libelle = serializers.CharField(
        source="etablissement_destination.libelle", read_only=True, default=""
    )
    piece_justificative_url = serializers.SerializerMethodField()
    auteur_nom = serializers.SerializerMethodField()

    class Meta:
        model = Mouvement
        fields = [
            "id",
            "type_mouvement",
            "date_mouvement",
            "etablissement_destination",
            "etablissement_destination_libelle",
            "motif",
            "piece_justificative_url",
            "auteur_nom",
            "cree_le",
        ]
        read_only_fields = fields

    def get_piece_justificative_url(self, obj: Mouvement) -> str:
        return obj.piece_justificative.url if obj.piece_justificative else ""

    def get_auteur_nom(self, obj: Mouvement) -> str:
        return obj.cree_par.get_full_name() if obj.cree_par else ""


class MouvementCreationSerializer(serializers.Serializer):
    type_mouvement = serializers.ChoiceField(
        choices=[
            "TRANSFERT",
            "EXTRACTION",
            "HOSPITALISATION",
            "PERMISSION_SORTIR",
            "EVASION",
            "REINTEGRATION",
            "LEVEE_ECROU",
        ]
    )
    etablissement_destination = serializers.UUIDField(required=False, allow_null=True)
    motif = serializers.CharField(required=False, allow_blank=True, default="")
    piece_justificative = serializers.FileField(required=False)
    date_mouvement = serializers.DateTimeField(required=False)


class PersonneDetenueListeSerializer(serializers.ModelSerializer):
    # `nom`/`prenom` sont un `core.champs.ChampChiffre` (BinaryField chiffré) —
    # déclarés explicitement en CharField, sinon DRF génère par défaut un champ
    # binaire qui appelle `BinaryField.value_to_string` (base64 sur des octets),
    # incompatible avec la chaîne déchiffrée que ce champ expose côté Python.
    nom = serializers.CharField(read_only=True)
    prenom = serializers.CharField(read_only=True)
    etablissement_libelle = serializers.CharField(source="etablissement.nom", read_only=True)

    class Meta:
        model = PersonneDetenue
        fields = [
            "id",
            "numero_ecrou",
            "nom",
            "prenom",
            "sexe",
            "situation_penale",
            "regime",
            "statut_dossier",
            "etablissement",
            "etablissement_libelle",
            "date_ecrou",
        ]
        read_only_fields = ["id", "numero_ecrou", "etablissement_libelle"]


class PersonneDetenueDetailSerializer(PersonneDetenueListeSerializer):
    photo_url = serializers.SerializerMethodField()
    mouvements = MouvementSerializer(many=True, read_only=True)

    class Meta(PersonneDetenueListeSerializer.Meta):
        fields = [
            *PersonneDetenueListeSerializer.Meta.fields,
            "date_naissance",
            "date_naissance_approximative",
            "photo_url",
            "date_liberation_prevue",
            "mouvements",
        ]
        read_only_fields = [
            *PersonneDetenueListeSerializer.Meta.read_only_fields,
            "photo_url",
            "mouvements",
        ]

    def get_photo_url(self, obj: PersonneDetenue) -> str:
        return obj.photo.url if obj.photo else ""


class PersonneDetenueCreationSerializer(serializers.ModelSerializer):
    # Voir la note dans `PersonneDetenueListeSerializer` — déclaration explicite
    # requise pour tout champ `ChampChiffre`.
    nom = serializers.CharField(max_length=150)
    prenom = serializers.CharField(max_length=150)

    class Meta:
        model = PersonneDetenue
        fields = [
            "id",
            "nom",
            "prenom",
            "date_naissance",
            "date_naissance_approximative",
            "sexe",
            "situation_penale",
            "regime",
            "etablissement",
            "photo",
            "date_ecrou",
        ]
        read_only_fields = ["id"]


class PersonneDetenueEditSerializer(serializers.ModelSerializer):
    """Champs modifiables hors mouvement (EF-1003 : `date_liberation_prevue` est
    saisie manuellement par un agent habilité, jamais calculée)."""

    class Meta:
        model = PersonneDetenue
        fields = ["id", "situation_penale", "regime", "date_liberation_prevue", "photo"]
        read_only_fields = ["id"]
