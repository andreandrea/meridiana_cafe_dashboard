-- Dati di esempio per sviluppo locale. Non necessario in produzione:
-- i dati reali (tavoli, orari, menu) si inseriscono dal pannello admin.

insert into opening_hours (day_of_week, shift_label, open_time, close_time, is_closed) values
  (1, 'pranzo', '12:00', '15:00', false),
  (1, 'cena', '19:00', '23:00', false),
  (2, 'pranzo', '12:00', '15:00', false),
  (2, 'cena', '19:00', '23:00', false),
  (3, 'pranzo', '12:00', '15:00', false),
  (3, 'cena', '19:00', '23:00', false),
  (4, 'pranzo', '12:00', '15:00', false),
  (4, 'cena', '19:00', '23:00', false),
  (5, 'pranzo', '12:00', '15:00', false),
  (5, 'cena', '19:00', '23:30', false),
  (6, 'pranzo', '12:00', '15:00', false),
  (6, 'cena', '19:00', '23:30', false),
  (0, 'pranzo', '12:00', '15:00', true);

insert into tables (label, seats_min, seats_max, pos_x, pos_y, shape) values
  ('Tavolo 1', 1, 2, 15, 20, 'round'),
  ('Tavolo 2', 1, 2, 35, 20, 'round'),
  ('Tavolo 3', 2, 4, 60, 20, 'rect'),
  ('Tavolo 4', 2, 4, 80, 20, 'rect'),
  ('Tavolo 5', 4, 6, 25, 55, 'rect'),
  ('Tavolo 6', 4, 6, 65, 55, 'rect'),
  ('Tavolo 7', 6, 8, 45, 85, 'rect');

insert into daily_menus (menu_date, is_published) values (current_date, true);

insert into menu_items (daily_menu_id, category, name, sort_order)
select id, 'primo', 'Penne al pomodoro e basilico', 1 from daily_menus where menu_date = current_date
union all
select id, 'primo', 'Risotto ai funghi', 2 from daily_menus where menu_date = current_date
union all
select id, 'secondo', 'Pollo alla piastra con fagiolini', 1 from daily_menus where menu_date = current_date
union all
select id, 'zuppa', 'Vellutata di verdure con farro', 1 from daily_menus where menu_date = current_date
union all
select id, 'insalata', 'Insalatone misto con tonno e uovo', 1 from daily_menus where menu_date = current_date;
