from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cal', '0015_story_heading_tracker_target_end_date_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='person',
            name='birthday',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.DeleteModel(
            name='Birthday',
        ),
    ]
