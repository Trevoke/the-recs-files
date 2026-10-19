export function recordInspection(log, stand, position, notes) {
  const inspection = {
    stand,
    position,
    notes,
    inspectedAt: new Date().toISOString(),
  };
  log.push(inspection);
  return inspection;
}
