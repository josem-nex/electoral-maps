/* Approximate Colombia departments map as SVG paths.
   Coordinates are stylized — good enough for a hi-fi mockup.
   Each path is a rough convex hull of the department's territory. */

window.COLOMBIA_MAP = {
  viewBox: '0 0 600 720',
  // The paths below trace approximate department outlines.
  // Coords arranged so map reads as Colombia: Caribbean coast top,
  // Pacific west, Amazon east-south.
  departments: [
    { code: '88', name: 'San Andrés',        d: 'M 60 40 L 90 40 L 90 70 L 60 70 Z' },
    { code: '44', name: 'La Guajira',        d: 'M 380 70 L 470 60 L 490 130 L 430 160 L 380 130 Z' },
    { code: '47', name: 'Magdalena',         d: 'M 320 110 L 380 130 L 380 200 L 310 210 L 290 160 Z' },
    { code: '08', name: 'Atlántico',         d: 'M 280 120 L 320 110 L 320 170 L 280 180 Z' },
    { code: '20', name: 'Cesar',             d: 'M 380 130 L 430 160 L 440 240 L 380 250 L 380 200 Z' },
    { code: '13', name: 'Bolívar',           d: 'M 230 150 L 290 160 L 310 210 L 280 280 L 260 320 L 220 290 L 210 220 Z' },
    { code: '70', name: 'Sucre',             d: 'M 230 200 L 280 200 L 280 250 L 240 260 Z' },
    { code: '23', name: 'Córdoba',           d: 'M 180 220 L 240 240 L 250 300 L 200 310 L 170 270 Z' },
    { code: '54', name: 'Norte de Santander',d: 'M 380 250 L 440 240 L 460 320 L 400 340 L 360 300 Z' },
    { code: '68', name: 'Santander',         d: 'M 320 280 L 380 270 L 400 340 L 350 380 L 300 350 Z' },
    { code: '05', name: 'Antioquia',         d: 'M 180 280 L 260 290 L 290 350 L 280 410 L 220 430 L 160 380 L 150 310 Z' },
    { code: '27', name: 'Chocó',             d: 'M 90 320 L 160 310 L 170 380 L 150 450 L 110 480 L 80 430 Z' },
    { code: '15', name: 'Boyacá',            d: 'M 300 350 L 360 340 L 400 400 L 360 440 L 310 410 Z' },
    { code: '17', name: 'Caldas',            d: 'M 200 380 L 260 380 L 280 420 L 230 440 L 200 420 Z' },
    { code: '66', name: 'Risaralda',         d: 'M 180 410 L 230 410 L 240 450 L 190 460 Z' },
    { code: '63', name: 'Quindío',           d: 'M 200 450 L 240 450 L 240 480 L 210 480 Z' },
    { code: '11', name: 'Bogotá D.C.',       d: 'M 300 430 L 330 430 L 330 460 L 300 460 Z' },
    { code: '25', name: 'Cundinamarca',      d: 'M 270 410 L 340 410 L 360 480 L 290 490 L 260 460 Z' },
    { code: '85', name: 'Casanare',          d: 'M 360 380 L 440 370 L 460 430 L 380 440 L 360 410 Z' },
    { code: '81', name: 'Arauca',            d: 'M 400 320 L 480 310 L 490 360 L 420 370 Z' },
    { code: '76', name: 'Valle del Cauca',   d: 'M 130 460 L 200 470 L 220 520 L 170 540 L 110 510 Z' },
    { code: '73', name: 'Tolima',            d: 'M 230 470 L 290 470 L 300 540 L 250 560 L 220 510 Z' },
    { code: '50', name: 'Meta',              d: 'M 320 470 L 430 470 L 470 560 L 380 590 L 320 550 Z' },
    { code: '19', name: 'Cauca',             d: 'M 130 530 L 200 540 L 230 600 L 170 620 L 110 580 Z' },
    { code: '41', name: 'Huila',             d: 'M 230 540 L 290 540 L 310 610 L 250 620 L 220 580 Z' },
    { code: '99', name: 'Vichada',           d: 'M 440 380 L 530 370 L 540 470 L 460 480 Z' },
    { code: '52', name: 'Nariño',            d: 'M 90 600 L 170 600 L 200 660 L 130 680 L 70 650 Z' },
    { code: '86', name: 'Putumayo',          d: 'M 170 630 L 240 620 L 260 670 L 200 690 Z' },
    { code: '18', name: 'Caquetá',           d: 'M 240 590 L 330 590 L 350 670 L 280 680 L 250 640 Z' },
    { code: '94', name: 'Guainía',           d: 'M 460 460 L 540 460 L 540 540 L 470 540 Z' },
    { code: '95', name: 'Guaviare',          d: 'M 350 540 L 450 540 L 460 610 L 380 620 Z' },
    { code: '97', name: 'Vaupés',            d: 'M 380 600 L 470 600 L 470 670 L 400 670 Z' },
    { code: '91', name: 'Amazonas',          d: 'M 280 660 L 410 670 L 430 710 L 290 710 Z' },
  ],
};
