module.exports = (existingCommand, localCommand) => {
  const getMinValue = (option) => option.min_value ?? option.minValue ?? null;
  const getMaxValue = (option) => option.max_value ?? option.maxValue ?? null;

  const areChoicesDifferent = (existingChoices, localChoices) => {
    for (const localChoice of localChoices) {
      const existingChoice = existingChoices?.find(
        (choice) => choice.name === localChoice.name
      );

      if (!existingChoice) {
        return true;
      }

      if (localChoice.value !== existingChoice.value) {
        return true;
      }
    }
    return false;
  };

  const areOptionsDifferent = (existingOptions, localOptions) => {
    for (const localOption of localOptions) {
      const existingOption = existingOptions?.find(
        (option) => option.name === localOption.name
      );

      if (!existingOption) {
        return true;
      }

      if (
        localOption.description !== existingOption.description ||
        localOption.type !== existingOption.type ||
        (localOption.required || false) !==
          (existingOption.required || false) ||
        (localOption.choices?.length || 0) !==
          (existingOption.choices?.length || 0) ||
        areChoicesDifferent(
          existingOption.choices || [],
          localOption.choices || []
        ) ||
        (localOption.options?.length || 0) !==
          (existingOption.options?.length || 0) ||
        areOptionsDifferent(
          existingOption.options || [],
          localOption.options || []
        ) ||
        getMinValue(localOption) !== getMinValue(existingOption) ||
        getMaxValue(localOption) !== getMaxValue(existingOption)
      ) {
        return true;
      }
    }
    return false;
  };

  if (
    existingCommand.description !== localCommand.description ||
    existingCommand.options?.length !== (localCommand.options?.length || 0) ||
    areOptionsDifferent(existingCommand.options || [], localCommand.options || [])
  ) {
    return true;
  }

  return false;
};