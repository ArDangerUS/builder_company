"""
Reports and Dashboard API views.
"""
from datetime import date, timedelta
from decimal import Decimal
from io import BytesIO

from django.db.models import Count, Sum, Q, F
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from openpyxl.utils import get_column_letter

from apps.projects.models import Project
from apps.invoices.models import Invoice, Payment


class DashboardView(APIView):
    """
    Dashboard statistics and data.
    GET /api/v1/reports/dashboard/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        current_month_start = today.replace(day=1)

        # Calculate stats
        active_projects_count = Project.objects.filter(
            status__in=['planning', 'in_progress']
        ).count()

        # Invoices this month
        invoices_this_month = Invoice.objects.filter(
            issue_date__gte=current_month_start,
            status__in=['issued', 'partially_paid', 'paid']
        ).aggregate(
            total=Sum('items__quantity', default=0) * Sum('items__unit_price', default=0)
        )

        # Calculate invoiced amount this month properly
        month_invoices = Invoice.objects.filter(
            issue_date__gte=current_month_start,
            status__in=['issued', 'partially_paid', 'paid']
        )
        invoiced_this_month = Decimal('0')
        for inv in month_invoices:
            invoiced_this_month += inv.total_amount

        # Payments this month
        paid_this_month = Payment.objects.filter(
            payment_date__gte=current_month_start
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # Total outstanding (unpaid amount)
        outstanding_invoices = Invoice.objects.filter(
            status__in=['issued', 'partially_paid']
        )
        total_outstanding = Decimal('0')
        for inv in outstanding_invoices:
            total_outstanding += inv.amount_due

        # Overdue invoices count
        overdue_count = Invoice.objects.filter(
            status__in=['issued', 'partially_paid'],
            due_date__lt=today
        ).count()

        # Chart: Invoices by month (last 12 months)
        twelve_months_ago = today - timedelta(days=365)
        invoices_by_month = []

        for i in range(12):
            month_date = today.replace(day=1) - timedelta(days=30*i)
            month_start = month_date.replace(day=1)
            if month_date.month == 12:
                month_end = month_date.replace(year=month_date.year+1, month=1, day=1) - timedelta(days=1)
            else:
                month_end = month_date.replace(month=month_date.month+1, day=1) - timedelta(days=1)

            # Issued this month
            month_invoices = Invoice.objects.filter(
                issue_date__gte=month_start,
                issue_date__lte=month_end,
                status__in=['issued', 'partially_paid', 'paid']
            )
            issued_amount = sum(inv.total_amount for inv in month_invoices)

            # Paid this month
            paid_amount = Payment.objects.filter(
                payment_date__gte=month_start,
                payment_date__lte=month_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

            invoices_by_month.append({
                'month': month_start.strftime('%Y-%m'),
                'month_name': month_start.strftime('%b %Y'),
                'issued': float(issued_amount),
                'paid': float(paid_amount),
            })

        invoices_by_month.reverse()

        # Chart: Projects by status
        projects_by_status = list(
            Project.objects.values('status')
            .annotate(count=Count('id'))
            .order_by('status')
        )

        status_labels = {
            'planning': 'Plánování',
            'in_progress': 'V realizaci',
            'completed': 'Dokončeno',
            'on_hold': 'Pozastaveno',
            'cancelled': 'Zrušeno',
        }

        for item in projects_by_status:
            item['status_display'] = status_labels.get(item['status'], item['status'])

        # Top 5 projects by budget
        top_projects = list(
            Project.objects.filter(planned_budget__gt=0)
            .order_by('-planned_budget')[:5]
            .values('id', 'name', 'number', 'planned_budget', 'actual_costs')
        )

        for proj in top_projects:
            proj['planned_budget'] = float(proj['planned_budget'])
            proj['actual_costs'] = float(proj['actual_costs'] or 0)

        # Recent projects (5)
        recent_projects = list(
            Project.objects.order_by('-created_at')[:5]
            .values('id', 'number', 'name', 'client_name', 'status', 'created_at')
        )

        for proj in recent_projects:
            proj['status_display'] = status_labels.get(proj['status'], proj['status'])
            proj['created_at'] = proj['created_at'].isoformat()

        # Recent invoices (5)
        recent_invoices = list(
            Invoice.objects.order_by('-created_at')[:5]
            .values('id', 'number', 'client_name', 'status', 'issue_date', 'due_date')
        )

        invoice_status_labels = {
            'draft': 'Koncept',
            'issued': 'Vystaveno',
            'partially_paid': 'Částečně uhrazeno',
            'paid': 'Uhrazeno',
            'overdue': 'Po splatnosti',
            'cancelled': 'Zrušeno',
        }

        for inv in recent_invoices:
            inv_obj = Invoice.objects.get(id=inv['id'])
            inv['total_amount'] = float(inv_obj.total_amount)
            inv['status_display'] = invoice_status_labels.get(inv['status'], inv['status'])
            inv['issue_date'] = inv['issue_date'].isoformat() if inv['issue_date'] else None
            inv['due_date'] = inv['due_date'].isoformat() if inv['due_date'] else None

        # Overdue invoices (5)
        overdue_invoices = []
        overdue_qs = Invoice.objects.filter(
            status__in=['issued', 'partially_paid'],
            due_date__lt=today
        ).order_by('due_date')[:5]

        for inv in overdue_qs:
            days_overdue = (today - inv.due_date).days
            overdue_invoices.append({
                'id': inv.id,
                'number': inv.number,
                'client_name': inv.client_name,
                'total_amount': float(inv.total_amount),
                'amount_due': float(inv.amount_due),
                'due_date': inv.due_date.isoformat(),
                'days_overdue': days_overdue,
            })

        return Response({
            'stats': {
                'active_projects': active_projects_count,
                'invoiced_this_month': float(invoiced_this_month),
                'paid_this_month': float(paid_this_month),
                'total_outstanding': float(total_outstanding),
                'overdue_count': overdue_count,
            },
            'charts': {
                'invoices_by_month': invoices_by_month,
                'projects_by_status': projects_by_status,
                'top_projects': top_projects,
            },
            'recent': {
                'projects': recent_projects,
                'invoices': recent_invoices,
                'overdue_invoices': overdue_invoices,
            }
        })


class ProjectsReportView(APIView):
    """
    Projects report with Excel export.
    GET /api/v1/reports/projects/?status=&manager=&date_from=&date_to=&export=excel
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = Project.objects.all().order_by('-created_at')

        # Filters
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        manager_filter = request.query_params.get('manager')
        if manager_filter:
            queryset = queryset.filter(manager_id=manager_filter)

        date_from = request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)

        date_to = request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        # Build report data
        data = []
        totals = {
            'planned_budget': Decimal('0'),
            'actual_costs': Decimal('0'),
            'invoiced_amount': Decimal('0'),
            'paid_amount': Decimal('0'),
            'outstanding': Decimal('0'),
        }

        status_labels = {
            'planning': 'Plánování',
            'in_progress': 'V realizaci',
            'completed': 'Dokončeno',
            'on_hold': 'Pozastaveno',
            'cancelled': 'Zrušeno',
        }

        for project in queryset:
            # Calculate invoiced and paid for this project
            project_invoices = Invoice.objects.filter(
                project=project,
                status__in=['issued', 'partially_paid', 'paid']
            )
            invoiced = sum(inv.total_amount for inv in project_invoices)
            paid = sum(inv.paid_amount for inv in project_invoices)
            outstanding = invoiced - paid

            row = {
                'id': project.id,
                'number': project.number,
                'name': project.name,
                'client_name': project.client_name,
                'manager_name': project.manager.get_full_name() if project.manager else '',
                'status': project.status,
                'status_display': status_labels.get(project.status, project.status),
                'planned_budget': float(project.planned_budget or 0),
                'actual_costs': float(project.actual_costs or 0),
                'invoiced_amount': float(invoiced),
                'paid_amount': float(paid),
                'outstanding': float(outstanding),
            }
            data.append(row)

            totals['planned_budget'] += project.planned_budget or Decimal('0')
            totals['actual_costs'] += project.actual_costs or Decimal('0')
            totals['invoiced_amount'] += invoiced
            totals['paid_amount'] += paid
            totals['outstanding'] += outstanding

        # Excel export
        if request.query_params.get('export') == 'excel':
            return self._export_excel(data, totals)

        return Response({
            'data': data,
            'totals': {k: float(v) for k, v in totals.items()},
            'count': len(data),
        })

    def _export_excel(self, data, totals):
        wb = Workbook()
        ws = wb.active
        ws.title = 'Projekty'

        # Styles
        header_font = Font(bold=True, color='FFFFFF')
        header_fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
        border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )

        # Headers
        headers = ['Číslo', 'Název', 'Klient', 'Manažer', 'Stav', 'Rozpočet', 'Náklady', 'Fakturováno', 'Zaplaceno', 'Dluh']
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.border = border
            cell.alignment = Alignment(horizontal='center')

        # Data rows
        for row_idx, row_data in enumerate(data, 2):
            ws.cell(row=row_idx, column=1, value=row_data['number']).border = border
            ws.cell(row=row_idx, column=2, value=row_data['name']).border = border
            ws.cell(row=row_idx, column=3, value=row_data['client_name']).border = border
            ws.cell(row=row_idx, column=4, value=row_data['manager_name']).border = border
            ws.cell(row=row_idx, column=5, value=row_data['status_display']).border = border
            ws.cell(row=row_idx, column=6, value=row_data['planned_budget']).border = border
            ws.cell(row=row_idx, column=7, value=row_data['actual_costs']).border = border
            ws.cell(row=row_idx, column=8, value=row_data['invoiced_amount']).border = border
            ws.cell(row=row_idx, column=9, value=row_data['paid_amount']).border = border
            ws.cell(row=row_idx, column=10, value=row_data['outstanding']).border = border

            # Number format for currency columns
            for col in [6, 7, 8, 9, 10]:
                ws.cell(row=row_idx, column=col).number_format = '#,##0.00'

        # Totals row
        total_row = len(data) + 2
        ws.cell(row=total_row, column=1, value='CELKEM').font = Font(bold=True)
        ws.cell(row=total_row, column=6, value=float(totals['planned_budget'])).font = Font(bold=True)
        ws.cell(row=total_row, column=7, value=float(totals['actual_costs'])).font = Font(bold=True)
        ws.cell(row=total_row, column=8, value=float(totals['invoiced_amount'])).font = Font(bold=True)
        ws.cell(row=total_row, column=9, value=float(totals['paid_amount'])).font = Font(bold=True)
        ws.cell(row=total_row, column=10, value=float(totals['outstanding'])).font = Font(bold=True)

        for col in range(1, 11):
            ws.cell(row=total_row, column=col).border = border
        for col in [6, 7, 8, 9, 10]:
            ws.cell(row=total_row, column=col).number_format = '#,##0.00'

        # Column widths
        column_widths = [15, 30, 25, 20, 15, 15, 15, 15, 15, 15]
        for col, width in enumerate(column_widths, 1):
            ws.column_dimensions[get_column_letter(col)].width = width

        # Save to buffer
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename=projekty.xlsx'
        return response


class InvoicesReportView(APIView):
    """
    Invoices report with Excel export.
    GET /api/v1/reports/invoices/?status=&project=&date_from=&date_to=&export=excel
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        queryset = Invoice.objects.exclude(status='draft').order_by('-issue_date')

        # Filters
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        project_filter = request.query_params.get('project')
        if project_filter:
            queryset = queryset.filter(project_id=project_filter)

        date_from = request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(issue_date__gte=date_from)

        date_to = request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(issue_date__lte=date_to)

        # Build report data
        data = []
        totals = {
            'total_amount': Decimal('0'),
            'paid_amount': Decimal('0'),
            'amount_due': Decimal('0'),
        }

        status_labels = {
            'draft': 'Koncept',
            'issued': 'Vystaveno',
            'partially_paid': 'Částečně uhrazeno',
            'paid': 'Uhrazeno',
            'overdue': 'Po splatnosti',
            'cancelled': 'Zrušeno',
        }

        for invoice in queryset:
            days_overdue = 0
            if invoice.due_date < today and invoice.status in ['issued', 'partially_paid']:
                days_overdue = (today - invoice.due_date).days

            row = {
                'id': invoice.id,
                'number': invoice.number,
                'issue_date': invoice.issue_date.isoformat(),
                'project_number': invoice.project.number if invoice.project else '',
                'project_name': invoice.project.name if invoice.project else '',
                'client_name': invoice.client_name,
                'total_amount': float(invoice.total_amount),
                'paid_amount': float(invoice.paid_amount),
                'amount_due': float(invoice.amount_due),
                'due_date': invoice.due_date.isoformat(),
                'status': invoice.status,
                'status_display': status_labels.get(invoice.status, invoice.status),
                'days_overdue': days_overdue,
                'is_overdue': invoice.is_overdue,
            }
            data.append(row)

            totals['total_amount'] += invoice.total_amount
            totals['paid_amount'] += invoice.paid_amount
            totals['amount_due'] += invoice.amount_due

        # Excel export
        if request.query_params.get('export') == 'excel':
            return self._export_excel(data, totals)

        return Response({
            'data': data,
            'totals': {k: float(v) for k, v in totals.items()},
            'count': len(data),
        })

    def _export_excel(self, data, totals):
        wb = Workbook()
        ws = wb.active
        ws.title = 'Faktury'

        # Styles
        header_font = Font(bold=True, color='FFFFFF')
        header_fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
        border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )
        overdue_fill = PatternFill(start_color='FFCCCC', end_color='FFCCCC', fill_type='solid')

        # Headers
        headers = ['Číslo', 'Datum', 'Projekt', 'Klient', 'Částka', 'Zaplaceno', 'K úhradě', 'Splatnost', 'Stav', 'Dnů po splatnosti']
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.border = border
            cell.alignment = Alignment(horizontal='center')

        # Data rows
        for row_idx, row_data in enumerate(data, 2):
            ws.cell(row=row_idx, column=1, value=row_data['number']).border = border
            ws.cell(row=row_idx, column=2, value=row_data['issue_date']).border = border
            ws.cell(row=row_idx, column=3, value=row_data['project_number']).border = border
            ws.cell(row=row_idx, column=4, value=row_data['client_name']).border = border
            ws.cell(row=row_idx, column=5, value=row_data['total_amount']).border = border
            ws.cell(row=row_idx, column=6, value=row_data['paid_amount']).border = border
            ws.cell(row=row_idx, column=7, value=row_data['amount_due']).border = border
            ws.cell(row=row_idx, column=8, value=row_data['due_date']).border = border
            ws.cell(row=row_idx, column=9, value=row_data['status_display']).border = border
            ws.cell(row=row_idx, column=10, value=row_data['days_overdue']).border = border

            # Highlight overdue rows
            if row_data['is_overdue']:
                for col in range(1, 11):
                    ws.cell(row=row_idx, column=col).fill = overdue_fill

            # Number format for currency columns
            for col in [5, 6, 7]:
                ws.cell(row=row_idx, column=col).number_format = '#,##0.00'

        # Totals row
        total_row = len(data) + 2
        ws.cell(row=total_row, column=1, value='CELKEM').font = Font(bold=True)
        ws.cell(row=total_row, column=5, value=float(totals['total_amount'])).font = Font(bold=True)
        ws.cell(row=total_row, column=6, value=float(totals['paid_amount'])).font = Font(bold=True)
        ws.cell(row=total_row, column=7, value=float(totals['amount_due'])).font = Font(bold=True)

        for col in range(1, 11):
            ws.cell(row=total_row, column=col).border = border
        for col in [5, 6, 7]:
            ws.cell(row=total_row, column=col).number_format = '#,##0.00'

        # Column widths
        column_widths = [15, 12, 15, 25, 15, 15, 15, 12, 18, 18]
        for col, width in enumerate(column_widths, 1):
            ws.column_dimensions[get_column_letter(col)].width = width

        # Save to buffer
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename=faktury.xlsx'
        return response


class DebtReportView(APIView):
    """
    Debt by clients report with Excel export.
    GET /api/v1/reports/debt/?export=excel
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()

        # Get all unpaid invoices grouped by client
        unpaid_invoices = Invoice.objects.filter(
            status__in=['issued', 'partially_paid']
        ).order_by('client_name', 'due_date')

        # Group by client
        clients_data = {}
        for invoice in unpaid_invoices:
            client = invoice.client_name
            if client not in clients_data:
                clients_data[client] = {
                    'client_name': client,
                    'client_ico': invoice.client_ico,
                    'unpaid_count': 0,
                    'total_debt': Decimal('0'),
                    'oldest_invoice_date': None,
                    'oldest_invoice_number': None,
                    'max_days_overdue': 0,
                    'invoices': [],
                }

            clients_data[client]['unpaid_count'] += 1
            clients_data[client]['total_debt'] += invoice.amount_due

            if clients_data[client]['oldest_invoice_date'] is None or invoice.issue_date < clients_data[client]['oldest_invoice_date']:
                clients_data[client]['oldest_invoice_date'] = invoice.issue_date
                clients_data[client]['oldest_invoice_number'] = invoice.number

            if invoice.due_date < today:
                days_overdue = (today - invoice.due_date).days
                if days_overdue > clients_data[client]['max_days_overdue']:
                    clients_data[client]['max_days_overdue'] = days_overdue

            clients_data[client]['invoices'].append({
                'id': invoice.id,
                'number': invoice.number,
                'amount_due': float(invoice.amount_due),
                'due_date': invoice.due_date.isoformat(),
            })

        # Convert to list and sort by debt
        data = sorted(
            clients_data.values(),
            key=lambda x: x['total_debt'],
            reverse=True
        )

        # Format dates
        for item in data:
            item['total_debt'] = float(item['total_debt'])
            if item['oldest_invoice_date']:
                item['oldest_invoice_date'] = item['oldest_invoice_date'].isoformat()

        # Totals
        totals = {
            'unpaid_count': sum(item['unpaid_count'] for item in data),
            'total_debt': sum(item['total_debt'] for item in data),
        }

        # Excel export
        if request.query_params.get('export') == 'excel':
            return self._export_excel(data, totals)

        return Response({
            'data': data,
            'totals': totals,
            'count': len(data),
        })

    def _export_excel(self, data, totals):
        wb = Workbook()
        ws = wb.active
        ws.title = 'Pohledávky'

        # Styles
        header_font = Font(bold=True, color='FFFFFF')
        header_fill = PatternFill(start_color='C00000', end_color='C00000', fill_type='solid')
        border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )

        # Headers
        headers = ['Klient', 'IČO', 'Počet faktur', 'Celkový dluh', 'Nejstarší faktura', 'Max. dnů po splatnosti']
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.border = border
            cell.alignment = Alignment(horizontal='center')

        # Data rows
        for row_idx, row_data in enumerate(data, 2):
            ws.cell(row=row_idx, column=1, value=row_data['client_name']).border = border
            ws.cell(row=row_idx, column=2, value=row_data['client_ico']).border = border
            ws.cell(row=row_idx, column=3, value=row_data['unpaid_count']).border = border
            ws.cell(row=row_idx, column=4, value=row_data['total_debt']).border = border
            ws.cell(row=row_idx, column=5, value=row_data['oldest_invoice_number']).border = border
            ws.cell(row=row_idx, column=6, value=row_data['max_days_overdue']).border = border

            ws.cell(row=row_idx, column=4).number_format = '#,##0.00'

        # Totals row
        total_row = len(data) + 2
        ws.cell(row=total_row, column=1, value='CELKEM').font = Font(bold=True)
        ws.cell(row=total_row, column=3, value=totals['unpaid_count']).font = Font(bold=True)
        ws.cell(row=total_row, column=4, value=totals['total_debt']).font = Font(bold=True)

        for col in range(1, 7):
            ws.cell(row=total_row, column=col).border = border
        ws.cell(row=total_row, column=4).number_format = '#,##0.00'

        # Column widths
        column_widths = [30, 12, 15, 18, 18, 22]
        for col, width in enumerate(column_widths, 1):
            ws.column_dimensions[get_column_letter(col)].width = width

        # Save to buffer
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename=pohledavky.xlsx'
        return response
