import time

from core.id import uuid7


def test_uuid7_expose_la_bonne_version():
    identifiant = uuid7()
    assert identifiant.version == 7


def test_uuid7_est_croissant_dans_le_temps():
    # Le tri n'est garanti qu'à la milliseconde près (48 bits de temporel) :
    # on espace donc les générations pour éviter un test intermittent.
    identifiants = []
    for _ in range(20):
        identifiants.append(uuid7())
        time.sleep(0.002)
    assert identifiants == sorted(identifiants)
