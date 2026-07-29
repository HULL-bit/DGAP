import pytest
from rest_framework.test import APIClient

from apps.comptes.models import AffectationRole, Perimetre, Permission, Role, Utilisateur
from apps.intranet.models import AccuseLectureNote, NoteDeService

pytestmark = pytest.mark.django_db


def _perimetre_national() -> Perimetre:
    perimetre, _ = Perimetre.objects.get_or_create(
        code="national", defaults={"type": Perimetre.TypePerimetre.NATIONAL, "libelle": "National"}
    )
    return perimetre


def _agent(email: str, perimetre: Perimetre | None = None) -> Utilisateur:
    utilisateur = Utilisateur.objects.create_user(
        email=email, mot_de_passe="x", est_agent_interne=True, mfa_active=True
    )
    if perimetre is not None:
        role = Role.objects.create(code=f"role-{email}", libelle=email)
        AffectationRole.objects.create(utilisateur=utilisateur, role=role, perimetre=perimetre)
    return utilisateur


def _gestionnaire_notes() -> Utilisateur:
    utilisateur = Utilisateur.objects.create_user(
        email="gestionnaire-notes@example.sn",
        mot_de_passe="x",
        est_agent_interne=True,
        mfa_active=True,
    )
    role = Role.objects.create(code="role-gestionnaire-notes", libelle="Gestionnaire notes")
    permission, _ = Permission.objects.get_or_create(
        code="intranet:publier", defaults={"libelle": "Publier des notes", "categorie": "intranet"}
    )
    role.permissions.set([permission])
    AffectationRole.objects.create(utilisateur=utilisateur, role=role, perimetre=None)
    return utilisateur


def test_une_note_nationale_est_visible_par_tout_agent():
    etablissement = Perimetre.objects.create(
        type=Perimetre.TypePerimetre.ETABLISSEMENT, code="mac-dakar", libelle="MAC de Dakar"
    )
    NoteDeService.objects.create(
        titre="Note nationale", contenu="x", perimetre_cible=_perimetre_national()
    )
    agent = _agent("agent-etablissement@example.sn", perimetre=etablissement)

    client = APIClient()
    client.force_authenticate(agent)
    reponse = client.get("/api/v1/intranet/notes")

    assert reponse.status_code == 200
    assert len(reponse.data["results"]) == 1


def test_une_note_ciblee_nest_visible_que_par_le_perimetre_concerne():
    mac_dakar = Perimetre.objects.create(
        type=Perimetre.TypePerimetre.ETABLISSEMENT, code="mac-dakar", libelle="MAC de Dakar"
    )
    mac_thies = Perimetre.objects.create(
        type=Perimetre.TypePerimetre.ETABLISSEMENT, code="mac-thies", libelle="MAC de Thiès"
    )
    NoteDeService.objects.create(titre="Note MAC Dakar", contenu="x", perimetre_cible=mac_dakar)

    agent_concerne = _agent("agent-dakar@example.sn", perimetre=mac_dakar)
    agent_autre = _agent("agent-thies@example.sn", perimetre=mac_thies)

    client = APIClient()
    client.force_authenticate(agent_concerne)
    assert len(client.get("/api/v1/intranet/notes").data["results"]) == 1

    client.force_authenticate(agent_autre)
    assert len(client.get("/api/v1/intranet/notes").data["results"]) == 0


def test_une_note_depubliee_nest_pas_visible():
    NoteDeService.objects.create(
        titre="Brouillon", contenu="x", perimetre_cible=_perimetre_national(), publie=False
    )
    agent = _agent("agent-brouillon@example.sn")

    client = APIClient()
    client.force_authenticate(agent)
    reponse = client.get("/api/v1/intranet/notes")

    assert reponse.data["results"] == []


def test_la_creation_de_note_est_refusee_sans_scope():
    client = APIClient()
    client.force_authenticate(_agent("sans-scope-notes@example.sn"))
    reponse = client.post(
        "/api/v1/backoffice/intranet/notes",
        {"titre": "Test", "contenu": "x", "perimetre_cible": str(_perimetre_national().pk)},
        format="json",
    )
    assert reponse.status_code == 403


def test_le_parcours_complet_creation_lecture_et_comptage():
    gestionnaire = _gestionnaire_notes()
    national = _perimetre_national()
    client_gestion = APIClient()
    client_gestion.force_authenticate(gestionnaire)

    creation = client_gestion.post(
        "/api/v1/backoffice/intranet/notes",
        {
            "titre": "Consignes de sécurité",
            "contenu": "x",
            "perimetre_cible": str(national.pk),
            "accuse_lecture_requis": True,
        },
        format="json",
    )
    assert creation.status_code == 201, creation.data
    note_id = creation.data["id"]
    assert creation.data["nombre_lectures"] == 0

    agent = _agent("lecteur@example.sn")
    client_agent = APIClient()
    client_agent.force_authenticate(agent)

    avant_lecture = client_agent.get(f"/api/v1/intranet/notes/{note_id}")
    assert avant_lecture.data["lu"] is False

    lecture = client_agent.post(f"/api/v1/intranet/notes/{note_id}/lecture")
    assert lecture.status_code == 200
    assert lecture.data["lu"] is True

    # Idempotent : un second accusé de lecture ne crée pas de doublon.
    client_agent.post(f"/api/v1/intranet/notes/{note_id}/lecture")
    assert AccuseLectureNote.objects.filter(note_id=note_id, utilisateur=agent).count() == 1

    detail_gestion = client_gestion.get(f"/api/v1/backoffice/intranet/notes/{note_id}")
    assert detail_gestion.data["nombre_lectures"] == 1
