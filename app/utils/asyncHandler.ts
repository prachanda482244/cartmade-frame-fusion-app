const asyncHandler = <T>(fn: () => Promise<T>) => {
  return async () => {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      console.error("Error occurred:", error);
      throw error;
    }
  };
};

export { asyncHandler };
