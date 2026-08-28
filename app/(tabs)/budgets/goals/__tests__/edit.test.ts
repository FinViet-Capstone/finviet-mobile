import { buildGoalPatch } from '../[id]';

// The backend treats an omitted field as "leave alone" and re-validates every field it IS given.
// Resending an untouched value can therefore fail on a rule the user never triggered — most
// obviously a deadline that was valid at creation and has since passed. So the patch must carry
// only what actually changed.
describe('buildGoalPatch', () => {
  const goal = {
    name: 'Mua IPhone 17',
    targetAmount: 32_000_000,
    deadline: '2026-10-28',
  };

  it('sends nothing when nothing was touched', () => {
    const patch = buildGoalPatch(goal, {
      name: 'Mua IPhone 17',
      targetAmount: 32_000_000,
      deadline: '2026-10-28',
    });

    expect(patch).toEqual({});
  });

  it('sends only the renamed field', () => {
    const patch = buildGoalPatch(goal, {
      name: 'Mua IPhone 17 Pro',
      targetAmount: 32_000_000,
      deadline: '2026-10-28',
    });

    expect(patch).toEqual({ name: 'Mua IPhone 17 Pro' });
  });

  it('sends only the new deadline when stretching the goal out', () => {
    // The case that matters for the savings-plan banner: pushing the deadline is how an
    // infeasible plan becomes adjustable, and it must not drag the target along with it.
    const patch = buildGoalPatch(goal, {
      name: 'Mua IPhone 17',
      targetAmount: 32_000_000,
      deadline: '2028-02-28',
    });

    expect(patch).toEqual({ deadline: '2028-02-28' });
  });

  it('sends only the new target when lowering it', () => {
    const patch = buildGoalPatch(goal, {
      name: 'Mua IPhone 17',
      targetAmount: 9_500_000,
      deadline: '2026-10-28',
    });

    expect(patch).toEqual({ targetAmount: 9_500_000 });
  });

  it('sends every field that changed at once', () => {
    const patch = buildGoalPatch(goal, {
      name: 'Mua IPhone 17 Pro Max',
      targetAmount: 40_000_000,
      deadline: '2028-02-28',
    });

    expect(patch).toEqual({
      name: 'Mua IPhone 17 Pro Max',
      targetAmount: 40_000_000,
      deadline: '2028-02-28',
    });
  });

  it('treats a goal with no deadline as a deadline being added', () => {
    // `deadline: null` is reachable on older rows; the draft always carries a date, so setting
    // one on such a goal has to register as a change rather than compare null against a string.
    const patch = buildGoalPatch(
      { name: 'Quỹ dự phòng', targetAmount: 10_000_000, deadline: null },
      { name: 'Quỹ dự phòng', targetAmount: 10_000_000, deadline: '2027-01-01' },
    );

    expect(patch).toEqual({ deadline: '2027-01-01' });
  });
});
