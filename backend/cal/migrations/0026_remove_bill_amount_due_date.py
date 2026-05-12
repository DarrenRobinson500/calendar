from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('cal', '0025_billinstance'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='bill',
            name='amount',
        ),
        migrations.RemoveField(
            model_name='bill',
            name='due_date',
        ),
    ]
