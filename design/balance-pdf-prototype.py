"""Design-only monthly report with synthetic fixtures; not an app PDF generator."""
from pathlib import Path
import re
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'output/pdf/balance-mensual-design.pdf'
FONTS = Path('/System/Library/Fonts/Supplemental')
for name, file in [('Report', 'Arial.ttf'), ('Report-Bold', 'Arial Bold.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(FONTS / file)))
TOKENS = (ROOT / 'src/ui/tokens.css').read_text()
def token(name):
    match = re.search(r'--color-' + name + r':\s*light-dark\((#[0-9a-fA-F]{6}),', TOKENS)
    if not match: raise ValueError(f'Missing light token: {name}')
    return colors.HexColor(match.group(1))
INK, MUTED, GREEN, RED, BLUE, BORDER, SOFT, PAGE, FILL = [token(n) for n in ['text', 'text-secondary', 'accent', 'destructive', 'info', 'border', 'accent-soft', 'surface', 'fill-on-surface']]
# Category, plan item, fixed/variable, planned expense, recorded expense.
PLAN = [
    ('Vivienda', 'Arriendo', 'Fijo', 2000000, 2000000),
    ('Servicios', 'Energía y agua', 'Fijo', 280000, 280000),
    ('Internet', 'Internet hogar', 'Fijo', 120000, 120000),
    ('Suscripciones', 'Suscripción mensual', 'Fijo', 80000, 80000),
    ('Alimentación', 'Mercado del mes', 'Variable', 1100000, 1180000),
    ('Transporte', 'Traslados del mes', 'Variable', 400000, 370000),
    ('Ocio', 'Salidas del mes', 'Variable', 350000, 310000),
    ('Otros', 'Imprevistos', 'Variable', 670000, 460000),
]
# Day, movement name, category (income has none), recorder, income, expense.
MOVEMENTS = [(1, 'Ingreso mensual', '-', 'Gian', 3000000, 0), (15, 'Ingreso mensual', '-', 'Ana', 2100000, 0)]
EXPENSES = [
    (1,'Arriendo','Vivienda','Gian',2000000),
    (2,'Energía y agua','Servicios','Ana',280000),
    (3,'Internet hogar','Internet','Gian',120000),
    (4,'Suscripción mensual','Suscripciones','Ana',80000),
    (5,'Mercado semana 1','Alimentación','Gian',320000),
    (6,'Traslados semana 1','Transporte','Ana',90000),
    (8,'Salida familiar','Ocio','Gian',110000),
    (10,'Farmacia','Otros','Ana',180000),
    (12,'Mercado semana 2','Alimentación','Ana',280000),
    (13,'Traslados semana 2','Transporte','Gian',100000),
    (16,'Cine','Ocio','Ana',95000),
    (18,'Artículos del hogar','Otros','Gian',160000),
    (19,'Mercado semana 3','Alimentación','Gian',310000),
    (20,'Traslados semana 3','Transporte','Ana',80000),
    (23,'Salida fin de semana','Ocio','Gian',105000),
    (25,'Imprevisto','Otros','Ana',120000),
    (26,'Mercado semana 4','Alimentación','Ana',270000),
    (29,'Traslados semana 4','Transporte','Gian',100000),
]
MOVEMENTS += [(day,name,category,member,0,amount) for day,name,category,member,amount in EXPENSES]
MOVEMENTS.sort(key=lambda row: row[0])
INCOME, EXPENSE = sum(r[4] for r in MOVEMENTS), sum(r[5] for r in MOVEMENTS)
PLANNED = sum(r[3] for r in PLAN)
assert (INCOME, EXPENSE, PLANNED, len(MOVEMENTS)) == (5100000,4800000,5000000,20)
for category,_,_,_,spent in PLAN:
    assert sum(r[5] for r in MOVEMENTS if r[2]==category)==spent

def money(value, signed=False):
    prefix = ('+' if value>=0 else '-') if signed else ('-' if value<0 else '')
    return prefix+'$ '+f'{abs(value):,}'.replace(',','.')
OUTPUT.parent.mkdir(parents=True,exist_ok=True)
W,H = A4
L,R = 40,W-40
c = canvas.Canvas(str(OUTPUT),pagesize=A4,pageCompression=1)
c.setTitle('contaro | Informe mensual | Septiembre 2026 | Maqueta')
c.setAuthor('contaro')
c.setSubject('Design-only monthly budget and movement report with synthetic data')
def text(x,top,value,size=10,bold=False,color=INK,align='left'):
    c.setFont('Report-Bold' if bold else 'Report',size);c.setFillColor(color)
    {'left':c.drawString,'right':c.drawRightString,'center':c.drawCentredString}[align](x,H-top,value)
def box(x,top,width,height,color,radius=0):
    c.setFillColor(color);c.roundRect(x,H-top-height,width,height,radius,fill=1,stroke=0)
def rule(top,x=L,end=R):
    c.setStrokeColor(BORDER);c.setLineWidth(.5);c.line(x,H-top,end,H-top)
def header(section,page):
    box(0,0,W,H,PAGE)
    text(L,44,'contaro',19,True,GREEN)
    text(R,43,'MAQUETA / DATOS DE EJEMPLO',8,True,MUTED,'right');rule(61)
    text(L,91,section,25,True)
    text(L,113,'Casa  /  Septiembre de 2026  /  COP',10,color=MUTED)
    text(R,113,'Mes cerrado',9,True,GREEN,'right')
    rule(787)
    text(L,802,'Informe mensual / Generado: 5 oct 2026, 10:00 (UTC-05:00)',7.5,color=MUTED)
    text(L,819,'Datos sintéticos. No es un estado de cuenta bancario.',7,color=MUTED)
    text(R,819,f'{page} / 3',7,color=MUTED,align='right')
def table_header(top,columns):
    box(L,top,R-L,24,FILL,4)
    for x,label,align in columns:text(x,top+16,label,8,True,MUTED,align)
def finish():c.showPage()

# Page 1: monthly result and context, no multi-month graphs or controls.
header('Informe mensual',1)
box(L,137,R-L,99,SOFT,12)
text(L+18,160,'BALANCE DE SEPTIEMBRE',8,True,GREEN)
text(L+18,193,money(INCOME-EXPENSE,True),28,True,GREEN)
text(L+18,216,'Ingresos menos gastos registrados',9,color=MUTED)
text(L+305,161,'Ingresos',9,color=MUTED);text(L+305,181,money(INCOME),14,True)
text(L+305,206,'Gastos registrados',9,color=MUTED);text(L+305,226,money(EXPENSE),14,True)
text(L,264,'Presupuesto del mes',13,True)
for x,label,value in [(L,'Presupuestado',PLANNED),(L+175,'Gastado',EXPENSE),(L+350,'Por gastar del plan',PLANNED-EXPENSE)]:
    text(x,285,label,9,color=MUTED);text(x,309,money(value),17,True,GREEN if x==L+350 else INK)
box(L,326,R-L,7,FILL,3);box(L,326,(R-L)*EXPENSE/PLANNED,7,GREEN,3)
text(L,351,'96 % del plan usado. Los $ 200.000 restantes no son el balance de $ 300.000.',8.5,color=MUTED)
text(L,383,'Ingresos frente a gastos',12,True)
for top,label,value,color in [(406,'Ingresos',INCOME,BLUE),(447,'Gastos registrados',EXPENSE,MUTED)]:
    text(L,top,label,9,color=MUTED);text(R,top,money(value),10,True,align='right')
    box(L,top+8,R-L,8,FILL,3);box(L,top+8,(R-L)*value/INCOME,8,color,3)
text(L,496,'En qué se gastó',12,True)
text(R,496,'Importes registrados en COP',8,color=MUTED,align='right')
for i,(category,_,_,_,spent) in enumerate(PLAN):
    top=521+i*26
    text(L,top,category,9);text(R,top,money(spent),9,True,align='right')
    box(L+110,top-6,220,5,FILL,2);box(L+110,top-6,220*spent/2000000,5,GREEN,2)
text(L,750,'20 movimientos: 2 ingresos y 18 gastos. Detalle completo en las páginas siguientes.',8.5,color=MUTED)
text(L,765,'El presupuesto es un plan; los movimientos son dinero registrado. No se suman dos veces.',8,color=MUTED)
finish()

# Page 2: planned-versus-recorded category comparison and every planned item.
header('Presupuesto del mes',2)
text(L,143,'Plan frente a gastos registrados',13,True)
text(R,143,'Diferencia = plan - gastado',8,color=MUTED,align='right')
columns=[(L+10,'Categoría','left'),(L+235,'Presupuestado','right'),(L+367,'Gastado','right'),(R-10,'Diferencia','right')]
table_header(156,columns)
for i,(category,_,_,planned,spent) in enumerate(PLAN):
    top=201+i*23
    for x,value,align in [(L+10,category,'left'),(L+235,money(planned),'right'),(L+367,money(spent),'right')]:text(x,top,value,9,align=align)
    text(R-10,top,money(planned-spent,True),9,True,RED if planned<spent else GREEN,'right');rule(top+7,L+10,R-10)
text(L+10,405,'Total',10,True);text(L+235,405,money(PLANNED),10,True,align='right');text(L+367,405,money(EXPENSE),10,True,align='right');text(R-10,405,money(PLANNED-EXPENSE,True),10,True,GREEN,'right')
text(L,444,'Todos los gastos previstos',13,True)
columns=[(L+10,'Gasto previsto / categoría','left'),(L+290,'Tipo','left'),(L+404,'Importe','right'),(R-10,'Pago','right')]
table_header(459,columns)
for i,(category,item,kind,planned,_) in enumerate(PLAN):
    top=504+i*28
    text(L+10,top,item,9);text(L+10,top+11,category,7,color=MUTED)
    text(L+290,top,kind,8);text(L+404,top,money(planned),8.5,align='right')
    text(R-10,top,'Pagado' if kind=='Fijo' else '-',8,color=GREEN if kind=='Fijo' else MUTED,align='right');rule(top+17,L+10,R-10)
text(L,752,'Fijos: $ 2.480.000 / Variables: $ 2.520.000 / Total del plan: $ 5.000.000.',8.5,color=MUTED)
text(L,767,'El estado de pago corresponde a gastos fijos. Un pago registrado ya está entre los movimientos.',8,color=MUTED)
finish()

# Page 3: every registered movement in the example, in record-date order.
header('Movimientos del mes',3)
text(L,143,'Detalle completo',13,True)
text(R,143,'20 movimientos / orden por fecha de registro',8,color=MUTED,align='right')
columns=[(L+8,'Fecha','left'),(L+64,'Movimiento','left'),(L+221,'Categoría','left'),(L+325,'Registró','left'),(L+380,'Dirección','left'),(R-8,'Importe COP','right')]
table_header(156,columns)
for i,(day,name,category,member,income,expense) in enumerate(MOVEMENTS):
    top=199+i*23
    text(L+8,top,f'{day:02}/09',8)
    text(L+64,top,name,8)
    text(L+221,top,category,8,color=MUTED)
    text(L+325,top,member,8)
    text(L+380,top,'Ingreso' if income else 'Gasto',7.5,color=BLUE if income else MUTED)
    text(R-8,top,money(income or expense),8,align='right');rule(top+7,L+8,R-8)
box(L,676,R-L,61,FILL,8)
for x,label,value,color in [(L+14,'Ingresos',INCOME,BLUE),(L+185,'Gastos registrados',EXPENSE,INK),(L+365,'Balance',INCOME-EXPENSE,GREEN)]:
    text(x,697,label,8,color=MUTED);text(x,722,money(value,label=='Balance'),15,True,color)
text(L,761,'Todos los importes son de septiembre de 2026. Cada movimiento se cuenta una sola vez.',8.5,color=MUTED)
finish()
c.save()
print(OUTPUT.relative_to(ROOT))
