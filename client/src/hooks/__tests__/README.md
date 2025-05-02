# Hook Tests

This directory contains unit tests for React hooks used in the LunchMate application.

## Running Tests

To run all tests:

```bash
npm test
```

To run only the hook tests:

```bash
npm run test:hooks
```

To run tests for a specific hook:

```bash
npm test -- -t "useRestaurants"
```

## Test Coverage

### useRestaurants Hook

The `use-restaurants.test.ts` file tests the `useRestaurants` hook, which is responsible for fetching, filtering, and managing restaurant data. The tests cover:

1. **Initialization**: Verifies the hook initializes with correct default values
2. **Filtering**: Tests that restaurants are properly filtered based on visit history
3. **Pagination**: Ensures the loadMore functionality works correctly to fetch additional pages of results
4. **Random Selection**: Tests the pickRandomRestaurant function to randomly select a restaurant
5. **Team Integration**: Verifies the addToTeam mutation works correctly
6. **Error Handling**: Tests how the hook handles API errors
7. **Location Validation**: Ensures the hook behaves correctly when location is undefined
8. **Refetching**: Tests the refetch functionality to manually trigger data fetching

## Mocking Strategy

The tests use Jest mocks to simulate:

1. **AppContext**: Provides mock location, filters, and visit history
2. **Fetch API**: Simulates API responses for restaurant data
3. **React Query**: Uses a QueryClientProvider wrapper to support the hook's React Query functionality
4. **Toast Notifications**: Mocks the toast notification system

## Adding New Tests

When adding tests for a new hook:

1. Create a new test file in this directory named `[hook-name].test.ts`
2. Import the necessary testing utilities and the hook to test
3. Mock any dependencies the hook relies on
4. Write tests that cover all the hook's functionality
5. Update this README to document the new tests