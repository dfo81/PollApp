/**
 * The shape of a survey while it is being drafted in the create form, plus the pure
 * helpers that work on it. Kept apart from the component so it holds nothing but data.
 */

/** One answer of a question that is being drafted. */
export interface DraftAnswer {
  /** Stable id for the template, not the database id. */
  id: number;
  text: string;
}

/** One question of a survey that is being drafted. */
export interface DraftQuestion {
  /** Stable id for the template, not the database id. */
  id: number;
  text: string;
  allowMultiple: boolean;
  answers: DraftAnswer[];
}

/**
 * Drops an answer from a question, or empties it when the question is down to its last
 * two. A question keeps at least two answers.
 *
 * @param question The question the answer belongs to.
 * @param answerId Id of the answer.
 * @returns The question with the answer removed or emptied.
 */
export function withoutAnswer(question: DraftQuestion, answerId: number): DraftQuestion {
  if (question.answers.length > 2) {
    return { ...question, answers: question.answers.filter((answer) => answer.id !== answerId) };
  }

  const answers = question.answers.map((answer) =>
    answer.id === answerId ? { ...answer, text: '' } : answer,
  );
  return { ...question, answers };
}

/**
 * Reads the current text of an input or textarea.
 *
 * @param event Input event of the field.
 * @returns The value of the field.
 */
export function value(event: Event): string {
  return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
}

/**
 * Replaces the text of one answer of a question.
 *
 * @param question Question the answer belongs to.
 * @param answerId Id of the answer.
 * @param text The new text.
 * @returns A copy of the question with the updated answer.
 */
export function withAnswerText(question: DraftQuestion, answerId: number, text: string): DraftQuestion {
  return {
    ...question,
    answers: question.answers.map((answer) =>
      answer.id === answerId ? { ...answer, text } : answer,
    ),
  };
}
