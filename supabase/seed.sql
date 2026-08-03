insert into public.categories(name,kind,icon,color) values
('Vivienda','expense','house','#668c7e'),('Supermercado','expense','shopping-basket','#26725c'),
('Restaurantes','expense','utensils','#e88064'),('Transporte','expense','car','#5c78a8'),
('Bebé','expense','baby','#d39bb2'),('Salud','expense','heart-pulse','#d45d5d'),
('Ocio','expense','party-popper','#9b75b6'),('Suscripciones','expense','repeat','#7188a8'),
('Ropa','expense','shirt','#b0826e'),('Educación','expense','graduation-cap','#c89f46'),
('Impuestos','expense','landmark','#77817e'),('Otros','expense','circle-ellipsis','#9aaaa5'),
('Nómina','income','briefcase','#26725c'),('Prestación','income','hand-coins','#4b8e72'),
('Reembolso','income','rotate-ccw','#5c78a8'),('Venta','income','tag','#9b75b6'),
('Transferencia recibida','income','arrow-down-left','#668c7e'),('Otros ingresos','income','circle-plus','#9aaaa5')
on conflict do nothing;
