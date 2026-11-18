import { autocompleteMultiselect, isCancel, select } from '@clack/prompts';

export async function pick(items, {
  title, initial = [], multiple = false,
  input = process.stdin, output = process.stdout,
} = {}) {
  if (!input.isTTY || !output.isTTY) {
    throw Error('Interactive terminal required. Run smv install --profile NAME --yes or pass explicit tool IDs.');
  }
  const options = items.map(({ id, label, hint }) => ({ value: id, label, hint }));
  const prompt = { message: title, options, input, output, maxItems: 10 };
  const result = multiple
    ? await autocompleteMultiselect({
      ...prompt,
      placeholder: 'Type to filter by tool or category',
      initialValues: initial,
      required: true,
      filter: (query, option) =>
        `${option.value} ${option.label} ${option.hint || ''}`.toLowerCase().includes(query.trim().toLowerCase()),
    })
    : await select(prompt);
  return isCancel(result) ? null : result;
}
