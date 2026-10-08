import {
  applyMonthYearMask,
  formatMonthYear,
  formatMonthYearLabel,
  getMonthLabel,
  parseMonthYear,
} from '../date';

describe('Date utils (Month / Year and Masking)', () => {
  it('aplica máscara MM/AAAA corretamente em números parciais e completos', () => {
    expect(applyMonthYearMask('')).toBe('');
    expect(applyMonthYearMask('1')).toBe('1');
    expect(applyMonthYearMask('10')).toBe('10');
    expect(applyMonthYearMask('102')).toBe('10/2');
    expect(applyMonthYearMask('102027')).toBe('10/2027');
    expect(applyMonthYearMask('10202799999')).toBe('10/2027');
  });

  it('faz parse correto de MM/AAAA', () => {
    expect(parseMonthYear('10/2027')).toEqual({ month: 10, year: 2027 });
    expect(parseMonthYear('01/2028')).toEqual({ month: 1, year: 2028 });
    expect(parseMonthYear('13/2027')).toBeNull();
    expect(parseMonthYear('00/2027')).toBeNull();
    expect(parseMonthYear('invalid')).toBeNull();
    expect(parseMonthYear('')).toBeNull();
  });

  it('formata rótulo de Mês/Ano a partir de ISO string', () => {
    const iso = '2027-10-15T00:00:00.000Z';
    const label = formatMonthYearLabel(iso);
    expect(label.toLowerCase()).toContain('outubro');
    expect(label).toContain('2027');
  });

  it('formatMonthYear aceita ISO string ou números de mês e ano', () => {
    expect(formatMonthYear(10, 2027)).toBe('10/2027');
    expect(formatMonthYear(5, 2026)).toBe('05/2026');
    const label = formatMonthYear('2027-10-15T00:00:00.000Z');
    expect(label.toLowerCase()).toContain('outubro');
    expect(label).toContain('2027');
  });

  it('getMonthLabel retorna nome completo capitalizado do mês', () => {
    const label = getMonthLabel(10, 2026);
    expect(label.toLowerCase()).toContain('outubro');
    expect(label).toContain('2026');
  });
});
