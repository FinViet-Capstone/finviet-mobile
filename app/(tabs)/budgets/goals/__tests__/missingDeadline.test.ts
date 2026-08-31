import { resolveSingleMissingDeadlineGoal } from '../index';

// The savings-plan banner reports how many goals its figures skipped for having no deadline, and
// offers a one-tap shortcut to fix it. The count comes from the backend (so it can't contradict
// the numbers it qualifies) while the tap needs a local goal object — this guard is what keeps
// those two sources from drifting into opening the wrong goal.
describe('resolveSingleMissingDeadlineGoal', () => {
  const goalA = { id: 'a', name: 'Quỹ dự phòng' };
  const goalB = { id: 'b', name: 'Mua xe' };

  it('offers the shortcut when both sources agree on exactly one', () => {
    expect(resolveSingleMissingDeadlineGoal(1, [goalA])).toBe(goalA);
  });

  it('offers nothing when no goal is missing a deadline', () => {
    expect(resolveSingleMissingDeadlineGoal(0, [])).toBeNull();
  });

  it('offers nothing when several goals are missing deadlines', () => {
    // There is no single goal to open, so the note stays plain guidance.
    expect(resolveSingleMissingDeadlineGoal(2, [goalA, goalB])).toBeNull();
  });

  it('offers nothing when the backend says one but the list has several', () => {
    // Sources disagree — opening either would be a guess.
    expect(resolveSingleMissingDeadlineGoal(1, [goalA, goalB])).toBeNull();
  });

  it('offers nothing when the backend says several but the list has one', () => {
    // The reverse skew, e.g. a goal completed between the two reads.
    expect(resolveSingleMissingDeadlineGoal(2, [goalA])).toBeNull();
  });

  it('offers nothing when the backend says one but the list is empty', () => {
    // Guards the array access: a naive [0] here would hand back undefined and crash the tap.
    expect(resolveSingleMissingDeadlineGoal(1, [])).toBeNull();
  });
});
