from click import argument
from flask.cli import AppGroup

from redash import models

manager = AppGroup(help="Organization management commands.")


@manager.command(name="list")
def list_command():
    """List all organizations"""
    orgs = models.Organization.query
    for i, org in enumerate(orgs.order_by(models.Organization.name)):
        if i > 0:
            print("-" * 20)

        print("Id: {}\nName: {}\nSlug: {}".format(org.id, org.name, org.slug))
