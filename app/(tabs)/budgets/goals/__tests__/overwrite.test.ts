import { replacesDifferentPendingSplit } from '../index';

// Applying the savings-plan recommendation upserts next month's allocation row, so any draft
// already scheduled there is replaced. In device testing a hand-set 61/23,4/15,6 was overwritten
// with no prompt at all — this guard is what turns that into a confirmation.
describe('replacesDifferentPendingSplit', () => {
  const proposed = { needsPct: 50, wantsPct: 26.47, savingsPct: 23.53 };

  it('warns when a different split is already scheduled', () => {
    // The exact case from testing: the customer's own 61/23,4/15,6 draft.
    const pending = { needsPct: 61, wantsPct: 23.4, savingsPct: 15.6 };

    expect(replacesDifferentPendingSplit(pending, proposed)).toBe(true);
  });

  it('does not warn when nothing is scheduled yet', () => {
    expect(replacesDifferentPendingSplit(null, proposed)).toBe(false);
  });

  it('does not warn when the scheduled split is already identical', () => {
    // Re-applying the same recommendation is a no-op — interrupting for it would be noise.
    expect(replacesDifferentPendingSplit({ ...proposed }, proposed)).toBe(false);
  });

  it('warns when only one bucket differs', () => {
    // Guards against comparing just the savings figure and missing a Needs/Wants-only edit.
    expect(
      replacesDifferentPendingSplit({ needsPct: 50, wantsPct: 30, savingsPct: 23.53 }, proposed),
    ).toBe(true);
  });

  it('treats an undefined pending field as nothing scheduled', () => {
    // Against a backend that predates pendingBeforeApply the field arrives undefined; the old
    // silent-overwrite behaviour is the fallback, not a crash or a spurious prompt.
    expect(replacesDifferentPendingSplit(undefined, proposed)).toBe(false);
  });

  it('warns when a split is scheduled but no proposal exists to compare against', () => {
    // Defensive: nulls on the proposed side must not read as "same", which would suppress the
    // warning exactly when the state is least understood.
    expect(
      replacesDifferentPendingSplit(
        { needsPct: 61, wantsPct: 23.4, savingsPct: 15.6 },
        { needsPct: null, wantsPct: null, savingsPct: null },
      ),
    ).toBe(true);
  });
});
