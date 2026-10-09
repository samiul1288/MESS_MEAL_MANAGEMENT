function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function positiveInteger(value) {
  return /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validAmount(value) {
  return /^\d{1,8}(?:\.\d{1,2})?$/.test(String(value));
}

module.exports = { text, positiveInteger, validDate, validAmount };
