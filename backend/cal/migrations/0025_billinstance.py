from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('cal', '0024_billcategory_bill_category'),
    ]

    operations = [
        migrations.CreateModel(
            name='BillInstance',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('bill', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='instances', to='cal.bill')),
            ],
            options={
                'ordering': ['-date'],
            },
        ),
    ]
