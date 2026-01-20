from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoice',
            name='invoice_type',
            field=models.CharField(
                choices=[
                    ('vydana', 'Faktura vydaná'),
                    ('prijata', 'Faktura přijatá'),
                    ('zalohova', 'Zálohová faktura'),
                    ('dobropis', 'Dobropis'),
                ],
                default='vydana',
                max_length=20,
                verbose_name='Typ faktury'
            ),
        ),
    ]
