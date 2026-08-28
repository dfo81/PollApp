import { withPreview } from './survey-mapping';
import { QuestionResult } from './survey.models';

/**
 * Builds the result of one question from the votes of its options.
 *
 * @param id Id of the question.
 * @param votes Votes per option, the options are named "a1", "a2" and so on.
 * @returns The result as {@link tally} would have produced it.
 */
function result(id: string, votes: number[]): QuestionResult {
  const total = votes.reduce((sum, count) => sum + count, 0);

  return {
    id,
    text: `Question ${id}`,
    totalVotes: total,
    options: votes.map((count, index) => ({
      id: `${id}${index + 1}`,
      text: `Option ${index + 1}`,
      votes: count,
      percent: total === 0 ? 0 : Math.round((count / total) * 100),
    })),
  };
}

describe('withPreview', () => {
  it('leaves the results untouched without a selection', () => {
    const results = [result('a', [3, 1])];

    expect(withPreview(results, new Set())).toBe(results);
  });

  it('counts a ticked option into its votes and percentages', () => {
    const [question] = withPreview([result('a', [3, 1])], new Set(['a2']));

    expect(question.totalVotes).toBe(5);
    expect(question.options[0]).toMatchObject({ votes: 3, percent: 60 });
    expect(question.options[1]).toMatchObject({ votes: 2, percent: 40 });
  });

  it('counts every ticked option of a multiple choice question', () => {
    const [question] = withPreview([result('a', [1, 1, 0])], new Set(['a1', 'a3']));

    expect(question.totalVotes).toBe(4);
    expect(question.options.map((option) => option.votes)).toEqual([2, 1, 1]);
  });

  it('fills the bars of a survey that has no votes yet', () => {
    const [question] = withPreview([result('a', [0, 0])], new Set(['a1']));

    expect(question.totalVotes).toBe(1);
    expect(question.options.map((option) => option.percent)).toEqual([100, 0]);
  });

  it('leaves the questions the selection does not touch alone', () => {
    const untouched = result('b', [2, 2]);
    const [, question] = withPreview([result('a', [1, 0]), untouched], new Set(['a1']));

    expect(question).toEqual(untouched);
  });
});
