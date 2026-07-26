#!/usr/bin/env python
import os
import sys


def main() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Django est introuvable. Vérifiez que l'environnement virtuel est activé "
            "et que les dépendances sont installées (pip install -e .[dev])."
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
